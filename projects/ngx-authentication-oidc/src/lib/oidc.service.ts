import { Inject, Injectable, InjectionToken } from "@angular/core";
import { LoginOptions, ResponseType } from "./configuration/login-options";
import { Logger } from "./logger/logger";
import jwt_decode from "jwt-decode";
import { AuthConfigService } from "./auth-config.service";
import { HttpClient, HttpParameterCodec, HttpParams } from '@angular/common/http';
import { catchError, firstValueFrom, map } from "rxjs";
import { v4 as uuid } from "uuid";
import { TokenStoreWrapper } from "./token-store/token-store-wrapper";
import { ProviderConfig } from "./configuration/provider-config";
import { ClientConfig } from "./configuration/client-config";

export const WindowToken = new InjectionToken('Window');

export interface UserInfo {
    
}

export interface LoginResult {
  isLoggedIn: boolean;
  idToken?: string;
  accessToken?: string;
  redirectPath?: string;
  userInfo?: UserInfo;
  expiresAt?: Date;
  state?: string;
}

interface Params {
  error_description?: string;
  error_uri?: string;
  expires_in?: string;
  error?: string;
  code?: string;
  id_token?: string;
  access_token?: string;
  state?: string;
}

interface State {
  state?: string,
  finalUrl?: string
}

class CustomHttpParamEncoder implements HttpParameterCodec {
  encodeKey(key: string): string {
    return encodeURIComponent(key);
  }
  encodeValue(value: string): string {
    return encodeURIComponent(value);
  }
  decodeKey(key: string): string {
    return decodeURIComponent(key);
  }
  decodeValue(value: string): string {
    return decodeURIComponent(value);
  }
} 

/**
 * The following parts of OIDC are Supported:
 * 
 * The core (https://openid.net/specs/openid-connect-core-1_0.html) with some exceptions as those
 * features are not usually used with a web client
 * * Initiating Login from a Third Party (Chapter 4)
 * * Requesting Claims using the "claims" Request Parameter (Chapter 5.5)
 * * Passing Request Parameters as JWTs (Chapter 6)
 * * Support for Self-Issued OpenID Provider (Chapter 7)
 * * Client Authentication (Chapter 9)
 * * Offline Access (Chapter 11)
 * 
 * The following is not supported but planned in a later version
 * *  5.3. UserInfo Endpoint
 * * 12.  Using Refresh Tokens
 *
 *
 * Discovery (https://openid.net/specs/openid-connect-discovery-1_0.html)
 *
 * 
 * Planned is support for the following
 * https://openid.net/specs/openid-connect-rpinitiated-1_0.html
 * https://openid.net/specs/openid-connect-session-1_0.html
 * https://openid.net/specs/oauth-v2-multiple-response-types-1_0.html
 * https://openid.net/specs/oauth-v2-form-post-response-mode-1_0.html
 * 
 * Maybe:
 * https://openid.net/specs/openid-connect-frontchannel-1_0.html
 * https://openid.net/specs/openid-financial-api-part-1-1_0.html
 * https://openid.net/specs/openid-financial-api-part-1-1_0.html
 * 
 * Never:
 * https://openid.net/specs/openid-connect-registration-1_0.html
 * https://openid.net/specs/openid-connect-backchannel-1_0.html
 * 
 */

 @Injectable()
export class OidcService {
  private readonly logger: Logger
  private readonly tokenStore: TokenStoreWrapper;
  private readonly clientConfig: ClientConfig;
  private providerConfig?: ProviderConfig;

  constructor(
      private readonly config: AuthConfigService,
      private readonly httpClient: HttpClient,
      @Inject(WindowToken) private readonly window: Window){
    this.logger = config.loggerFactory('OidcService');
    this.clientConfig = config.client;
    this.tokenStore = config.tokenStore;
  } 

  //TODO: Implement OIDC Discovery (https://openid.net/specs/openid-connect-discovery-1_0.html)
  public initialize(): any {
    if(typeof(this.config.provider) === 'string') {
      throw new Error('Method not implemented.');
    }
    this.providerConfig = this.config.provider;
  }

  public async checkResponse() : Promise<LoginResult> {
    const currentUrl = new URL(this.window.location.href);
    const params = this.parseResponseParams(currentUrl);
    const redirectUrl = new URL(this.clientConfig.redirectUri);
  
    if(currentUrl.pathname !== redirectUrl.pathname) {
      this.logger.debug('This is not a redirect as URL', currentUrl,' is not redirect url', redirectUrl);
      return {isLoggedIn: false};
    }
    if(params.error) {
      return this.handleErrorResponse(params);
    }
    const hasCode = !!params.code;
    const hasToken = params.id_token || params.access_token;
    if(hasCode && hasToken) {
      throw new Error('Login failed: Hybrid Flow not supported')
    }
    if(hasCode) {
      return this.handleCodeResponse(params);
    }
    if(hasToken) {
      return this.handleTokenResponse(params);
    }
    this.logger.debug('This is not a redirect as URL as no return params can be detected');
    return {isLoggedIn: false};
  }

  private parseResponseParams(currentUrl: URL): Params  {
    if(currentUrl.hash) {
      //Move the hash into the search param
      currentUrl.search = currentUrl.hash.substr(1);
    }
    const ret = {} as any;
    currentUrl.searchParams.forEach((value, key) => ret[key] = value);
    return ret;
  }

  //TODO: Implement Authentication Response Validation (Chapter 3.1.2.7.)
  //TODO: Implement confidential clients
  //TODO: Validate nonce
  private async handleCodeResponse(params: Params): Promise<LoginResult> {
    const payload = new HttpParams({encoder: new CustomHttpParamEncoder()})
      .set('client_id', this.clientConfig.clientId)
      .set('grant_type', 'authorization_code')
      .set('code', params.code!)
      .set('redirect_uri', this.clientConfig.redirectUri);
    const state = this.decodeState(params.state);
    const tokenResponse = await firstValueFrom(this.httpClient.post(this.providerConfig!.tokenEndpoint, payload).pipe(
      map(r => this.handleTokenResponse(r)),
      catchError(e => this.handleErrorResponse(e.error))
    ));
    return {
      ...tokenResponse,
      redirectPath: state.finalUrl,
      state: state.state
    };
  }

  //TODO: Implement Response Validation (Chapter 3.2.2.8, 3.2.2.9, 3.1.2.11, 3.1.3.5, 3.1.3.7, 3.1.3.8 )
  private handleTokenResponse(response: Params): LoginResult {
    const accessToken = response.access_token ?? undefined;
    const idToken = response.id_token ?? undefined;
    const userInfo = idToken ? jwt_decode<UserInfo>(idToken) : undefined;
    const expiresIn = response.expires_in;
    const expiresAt = expiresIn ? new Date(Date.now() + parseInt(expiresIn)*1000) : undefined;
    const state = response.state ? this.decodeState(response.state) : undefined;
    const result = {
      isLoggedIn: true,
      accessToken: accessToken,
      idToken: idToken,
      expiresAt: expiresAt,
      userInfo: userInfo,
      redirectPath: state?.finalUrl,
      state: state?.state
    }
    console.log('Check result');
    console.log(idToken);
    console.log(userInfo);
    console.log(result);
    return result;
  }
  
  private handleErrorResponse(params: Params): Promise<LoginResult> {
    const error = params.error!;
    const description = params.error_description;
    const uri = params.error_uri;
    this.logger.info('Login failed',error, description, uri);
    throw new Error("Login failed: " + error);
  }

  async login(loginOptions: LoginOptions): Promise<LoginResult> {
    const url = this.createAuthenticationRequest(loginOptions)
    this.logger.info('Start a login request to', url);
    this.window.location.href = url.toString();
    return new Promise<LoginResult>((_, reject) => setTimeout(() => reject("Browser should be redirected"), 1000));
  }

  private createAuthenticationRequest(loginOptions: LoginOptions): URL {
    const nonce = uuid();
    this.tokenStore.setString('nonce', nonce);
    const state = this.encodeState(loginOptions);
  
    const url = new URL(this.providerConfig!.authEndpoint);
    url.searchParams.append("response_type", loginOptions.response_type ?? ResponseType.AUTH_CODE_FLOE );
    url.searchParams.append("scope", loginOptions.scope?.join(" ") ?? "openid profile");
    url.searchParams.append("client_id", this.clientConfig.clientId);
    url.searchParams.append("state", state);
    url.searchParams.append("redirect_uri", this.clientConfig.redirectUri);
    url.searchParams.append("nonce", nonce);
    if(loginOptions.prompt) {
      url.searchParams.append("prompt", loginOptions.prompt);
    }
    if(loginOptions.ui_locales) {
      url.searchParams.append("ui_locales", loginOptions.ui_locales);
    }
    if(loginOptions.id_token_hint) {
      url.searchParams.append("id_token_hint", loginOptions.id_token_hint);
    }
    if(loginOptions.login_hint) {
      url.searchParams.append("login_hint", loginOptions.login_hint);
    }
    if(loginOptions.acr_values) {
      url.searchParams.append("acr_values", loginOptions.acr_values);
    }
    return url;
  }

  private decodeState(state: string | undefined): State{
    if(!state){
      console.info("No state returned");
      return {};
    }
    try {
      console.info("State returned", state, JSON.parse(state));
      return JSON.parse(state);
    } catch (e) {
      console.info("Invalid state returned", state, e);
      return { state: state};
    }
  }

  private encodeState(loginOptions: LoginOptions): string{
    return JSON.stringify({state: loginOptions.state, finalURL: loginOptions.finalUrl});
  }

  //TODO: Implement silent login
  async silentLogin(loginOptions: LoginOptions): Promise<LoginResult> {
    throw new Error('Method not implemented.' + loginOptions);
  }

  //TODO: Implement single logout
  async logout() {
    //Nothing to do here
  }
}
