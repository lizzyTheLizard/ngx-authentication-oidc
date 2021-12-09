import { Inject, Injectable, InjectionToken } from "@angular/core";
import { LoginOptions } from "../configuration/login-options";
import { Logger } from "../logger/logger";
import jwt_decode from "jwt-decode";
import { AuthConfigService } from "../auth-config.service";
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, firstValueFrom, map, Observable, of, Subject, timeout } from "rxjs";
import { TokenStoreWrapper } from "../token-store/token-store-wrapper";
import { ProviderConfig } from "../configuration/provider-config";
import { ClientConfig } from "../configuration/client-config";
import { CustomHttpParamEncoder } from "./custom-http-params-encoder";
import { LoginResult, UserInfo } from "./login-result";
import { createAuthenticationRequest, Metadata, parseResponseParams, RequestParams, ResponseParams } from "./messages";
import { Location } from "@angular/common";

export const WindowToken = new InjectionToken('Window');
export const DocumentToken = new InjectionToken('Document');
const silentRefreshIFrameName = 'silent-refresh-iframe';

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
 * Discovery (https://openid.net/specs/openid-connect-discovery-1_0.html)
 * 
 * 
 * The following is not supported but planned in a later version
 * *  5.3. UserInfo Endpoint
 * * 12.  Using Refresh Tokens
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
  private silentRefreshPostMessageEventListener: ((e: MessageEvent) => void) | undefined;

  constructor(
      private readonly config: AuthConfigService,
      private readonly httpClient: HttpClient,
      private readonly location: Location,
      @Inject(DocumentToken) private readonly document: Document,
      @Inject(WindowToken) private readonly window: Window){
    this.logger = config.loggerFactory('OidcService');
    this.clientConfig = config.client;
    this.tokenStore = config.tokenStore;
  } 

  public async initialize(): Promise<void> {
    if(typeof(this.config.provider) === 'string') {
      this.providerConfig = await this.oidcDiscovery(this.config.provider);
    } else {
      this.providerConfig = this.config.provider;
    }
  }

  private async oidcDiscovery(issuer: string): Promise<ProviderConfig>{
    const url = issuer + "/.well-known/openid-configuration";
    const metadata = await firstValueFrom(this.httpClient.get<Metadata>(url));
    return {
      tokenEndpoint: metadata.token_endpoint,
      authEndpoint: metadata.authorization_endpoint
    }
  }

  public async checkResponse() : Promise<LoginResult> {
    const currentUrl = new URL(this.window.location.href);
    const redirectUrl = new URL(this.clientConfig.redirectUri);
    if(currentUrl.pathname !== redirectUrl.pathname) {
      this.logger.debug('This is not a redirect as URL', currentUrl,' is not redirect url', redirectUrl);
      return {isLoggedIn: false};
    }
    if(currentUrl.hash) {
      return this.checkResponseUrl(currentUrl.hash.substr(1), redirectUrl);
    } else {
      return this.checkResponseUrl(currentUrl.search, redirectUrl);
    }
  }
  
  private async checkResponseUrl(searchParams: string, redirectUri: URL) : Promise<LoginResult> {
    const params = parseResponseParams(searchParams);
    this.logger.debug('Parsed response', params);
    if(params.error) {
      return this.handleErrorResponse(params);
    }
    const hasCode = !!params.code;
    const hasToken = params.id_token || params.access_token;
    if(hasCode && hasToken) {
      throw new Error('Login failed: Hybrid Flow not supported')
    }
    if(hasCode) {
      return this.handleCodeResponse(params, redirectUri);
    }
    if(hasToken) {
      return this.handleTokenResponse(params);
    }
    this.logger.debug('This is not a redirect as URL as no return params can be detected');
    return {isLoggedIn: false};
  }

  //TODO: Implement Authentication Response Validation (Chapter 3.1.2.7.)
  //TODO: Implement confidential clients
  private async handleCodeResponse(params: ResponseParams, redirectUrl: URL): Promise<LoginResult> {
    const payload = new HttpParams({encoder: new CustomHttpParamEncoder()})
      .set('client_id', this.clientConfig.clientId)
      .set('grant_type', 'authorization_code')
      .set('code', params.code!)
      .set('redirect_uri', redirectUrl.toString());
    const tokenResponse = await firstValueFrom(this.httpClient.post(this.providerConfig!.tokenEndpoint, payload).pipe(
      map(r => this.handleTokenResponse(r)),
      catchError(e => this.handleErrorResponse(e.error))
    ));

    return {
      ...tokenResponse,
      //The result from the first state is relevant, so overwrite this here...
      redirectPath: params.finalUrl,
      stateMessage: params.stateMessage
    };
  }

  //TODO: Implement Response Validation (Chapter 3.2.2.8, 3.2.2.9, 3.1.2.11, 3.1.3.5, 3.1.3.7, 3.1.3.8 )
  //TODO: Validate nonce
  private handleTokenResponse(response: ResponseParams): LoginResult {
    const accessToken = response.access_token ?? undefined;
    const idToken = response.id_token ?? undefined;
    const userInfo = idToken ? jwt_decode<UserInfo>(idToken) : undefined;
    const expiresIn = response.expires_in;
    const expiresAt = expiresIn ? new Date(Date.now() + parseInt(expiresIn)*1000) : undefined;
    const result = {
      isLoggedIn: true,
      accessToken: accessToken,
      idToken: idToken,
      expiresAt: expiresAt,
      userInfo: userInfo,
      redirectPath: response.finalUrl,
      stateMessage: response.stateMessage
    }
    console.log('Check result');
    console.log(idToken);
    console.log(userInfo);
    console.log(result);
    return result;
  }
  
  private handleErrorResponse(params: ResponseParams): Promise<LoginResult> {
    const error = params.error!;
    const description = params.error_description;
    const uri = params.error_uri;
    this.logger.info('Login failed',error, description, uri);
    throw new Error("Login failed: " + error);
  }

  async login(loginOptions: LoginOptions): Promise<LoginResult> {
    const requestParams: RequestParams = {
      ...loginOptions,
      authEndpoint: this.providerConfig!.authEndpoint,
      clientId: this.clientConfig.clientId,
      nonce: this.createNonce(),
      redirectUri: this.clientConfig.redirectUri,
    };
    const url = createAuthenticationRequest(requestParams)
    this.logger.info('Start a login request to', url);
    this.window.location.href = url.toString();
    return new Promise<LoginResult>((_, reject) => setTimeout(() => reject("Browser should be redirected"), 1000));
  }

  async silentLogin(loginOptions: LoginOptions): Promise<LoginResult> {
    if(!this.config.silentLoginEnabled) {
      throw new Error("Silent login is not enabled");
    }
    const requestParams: RequestParams = {
      ...loginOptions,
      authEndpoint: this.providerConfig!.authEndpoint,
      clientId: this.clientConfig.clientId,
      nonce: this.createNonce(),
      redirectUri: this.getSilentRefreshUrl().toString(),
      prompt: "none",
    };
    const url = createAuthenticationRequest(requestParams)
    const iframe = this.createIFrame(url);
    const result = this.setupSilentLoginEventListener(iframe);
    this.document.body.appendChild(iframe);
    const timeoutOptions = {
      each: this.config.silentLoginTimeoutInSecond * 1000,
      with: () => {
        this.logger.info('Silent Login did not return within timeout');
        return of({isLoggedIn: false});
      }
    };
    return firstValueFrom(result.pipe(timeout(timeoutOptions)));
  }

  private getSilentRefreshUrl(): URL {
    const urlStr = this.config.silentRefreshRedirectUri ?? this.location.prepareExternalUrl('assets/silent-refresh.html');
    try {
      return new URL(urlStr);
    } catch (e) {
      const result = new URL(this.window.location.href);
      result.pathname = "/assets/silent-refresh.html";
      this.logger.info('silentRefreshRedirectUri and base href are both not set, use origin as redirect URI', result);
      return result;
    }
  }

  private createNonce(): string {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const nonce = array[0].toString();
    this.tokenStore.setString('nonce', nonce);
    return nonce;
  }

  private createIFrame(url: URL): HTMLIFrameElement {
    const existingIframe = this.document.getElementById(silentRefreshIFrameName);
    if (existingIframe) {
      this.document.body.removeChild(existingIframe);
    }
    const iframe = this.document.createElement('iframe');
    iframe.id = silentRefreshIFrameName;
    iframe.style['display'] = 'none';
    iframe.setAttribute('src', url.toString());
    return iframe;
  }
  
  private setupSilentLoginEventListener(iframe: HTMLIFrameElement) : Observable<LoginResult> {
    if (this.silentRefreshPostMessageEventListener) {
      this.window.removeEventListener('message',this.silentRefreshPostMessageEventListener);
    }
    const subject = new Subject<LoginResult>();
    this.silentRefreshPostMessageEventListener = e => this.silentLoginEventListener(subject, iframe, e);
    this.window.addEventListener('message',this.silentRefreshPostMessageEventListener);
    return subject;
  }

  private silentLoginEventListener(subject: Subject<LoginResult>, iframe: HTMLIFrameElement, e: MessageEvent){
    if(e.origin !== this.window.location.origin) {
      return;
    }
    if (!e || !e.data || typeof e.data !== 'string') {
      return;
    }
    if(!e.source || (e.source as any !== iframe && (e.source as any).parent !== this.window)) {
      return;
    }
    this.window.removeEventListener("message", this.silentRefreshPostMessageEventListener!);
    const redirectUrl = this.getSilentRefreshUrl();
    this.logger.info('Got silent refrehs response', e.data);
    this.checkResponseUrl(e.data, redirectUrl).then(
      result => subject.next(result), 
      error => subject.error(error)
    );
  }

  //TODO: Implement single logout
  async logout() {
    //Nothing to do here
  }
}
