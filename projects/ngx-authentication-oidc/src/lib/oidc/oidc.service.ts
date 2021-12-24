import { Inject, Injectable, InjectionToken } from "@angular/core";
import { LoginOptions, ResponseType } from "../configuration/login-options";
import { Logger } from "../logger/logger";
import { AuthConfigService } from "../auth-config.service";
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, firstValueFrom, map, Observable, of, Subject, timeout } from "rxjs";
import { TokenStoreWrapper } from "../token-store/token-store-wrapper";
import { ProviderConfig } from "../configuration/provider-config";
import { ClientConfig } from "../configuration/client-config";
import { CustomHttpParamEncoder } from "./custom-http-params-encoder";
import { Location } from "@angular/common";
import { importJWK, JWTHeaderParameters, jwtVerify, KeyLike } from 'jose'
import { ValidatorService } from "./validator.service";
import { oidcDiscovery } from "./oidc-discovery";

interface State {
  stateMessage?: string;
  finalUrl?: string;
}
interface ResponseParams extends State {
  error_description?: string;
  error_uri?: string;
  expires_in?: string;
  error?: string;
  code?: string;
  id_token?: string;
  access_token?: string;
}

interface RequestParams extends State {
  authEndpoint: string | URL;
  clientId: string;
  redirectUri: string;
  response_type?: string;
  scope?: string[];
  prompt?: string;
  ui_locales?: string;
  id_token_hint?: string;
  login_hint?: string;
  acr_values?: string;
  nonce?: string;
}

export interface LoginResult {
  isLoggedIn: boolean;
  idToken?: string;
  accessToken?: string;
  redirectPath?: string;
  userInfo?: UserInfo;
  expiresAt?: Date;
  stateMessage?: string;
}

export interface UserInfo {
  sub: string;
}

export const WindowToken = new InjectionToken('Window');
export const DocumentToken = new InjectionToken('Document');
const silentRefreshIFrameName = 'silent-refresh-iframe';

/**
 * The following parts of OIDC are Supported:
 * 
 * Core (https://openid.net/specs/openid-connect-core-1_0.html)
 * The following features are not supported as they are not usually used with a web client
 * * Initiating Login from a Third Party (Chapter 4)
 * * Requesting Claims using the "claims" Request Parameter (Chapter 5.5)
 * * Passing Request Parameters as JWTs (Chapter 6)
 * * Support for Self-Issued OpenID Provider (Chapter 7)
 * * Client Authentication (Chapter 9)
 * * Offline Access (Chapter 11)
 * The following features are planned in a later version
 * * UserInfo Endpoint (Chapter 5.3)
 * * Using Refresh Tokens (Chapter 12)
 * 
 * Discovery (https://openid.net/specs/openid-connect-discovery-1_0.html)
 * 
 * 
 * Planned is support for the following
 * RP-Initiated Logout (https://openid.net/specs/openid-connect-rpinitiated-1_0.html)
 * Session Management (https://openid.net/specs/openid-connect-session-1_0.html)
 * 
 * 
 * Maybe:
 * https://openid.net/specs/openid-connect-frontchannel-1_0.html
 * 
 * https://openid.net/specs/openid-financial-api-part-1-1_0.html
 * https://openid.net/specs/openid-financial-api-part-1-1_0.html
 * 
 * Never:
 * Form Post Response (https://openid.net/specs/oauth-v2-form-post-response-mode-1_0.html)
 * 
 * https://openid.net/specs/openid-connect-registration-1_0.html
 * https://openid.net/specs/openid-connect-backchannel-1_0.html
 * 
 */

@Injectable()
export class OidcService {
  private readonly logger: Logger
  private readonly tokenStore: TokenStoreWrapper;
  private readonly clientConfig: ClientConfig;
  private readonly encoder = new CustomHttpParamEncoder();
  private providerConfig?: ProviderConfig;
  private silentRefreshPostMessageEventListener: ((e: MessageEvent) => void) | undefined;

  constructor(
      private readonly config: AuthConfigService,
      private readonly httpClient: HttpClient,
      private readonly location: Location,
      private readonly validator: ValidatorService,
      @Inject(DocumentToken) private readonly document: Document,
      @Inject(WindowToken) private readonly window: Window){
    this.logger = config.loggerFactory('OidcService');
    this.clientConfig = config.client;
    this.tokenStore = config.tokenStore;
  }

  public async initialize(): Promise<void> {
    if(typeof(this.config.provider) === 'string') {
      this.providerConfig = await oidcDiscovery(this.httpClient, this.config.provider);
    } else {
      this.providerConfig = this.config.provider;
    }
    this.validator.setProviderConfig(this.providerConfig);
  }

  public async checkResponse() : Promise<LoginResult> {
    const currentUrl = new URL(this.window.location.href);
    const redirectUrl = new URL(this.clientConfig.redirectUri);
    if(currentUrl.pathname !== redirectUrl.pathname) {
      this.logger.debug('This is not a redirect as URL', currentUrl,' is not redirect url', redirectUrl);
      return {isLoggedIn: false};
    }
    const params = this.parseResponseParams(currentUrl.hash ? currentUrl.hash.substr(1): currentUrl.search);
    return this.handleResponse(params, redirectUrl);
  }
  
  private parseResponseParams(queryString: string): ResponseParams  {
    const urlSearchParams = new URLSearchParams(queryString);
    const state = this.parseResponseState(urlSearchParams.get('state'));
    return {
      ...state,
      error_description: urlSearchParams.get('error_description') ?? undefined,
      error_uri: urlSearchParams.get('error_uri') ?? undefined,
      expires_in: urlSearchParams.get('expires_in') ?? undefined,
      error: urlSearchParams.get('error') ?? undefined,
      code: urlSearchParams.get('code') ?? undefined,
      id_token: urlSearchParams.get('id_token') ?? undefined,
      access_token: urlSearchParams.get('access_token') ?? undefined,
    };
  }

  private parseResponseState(state: string | null) : State {
    if(!state) {
      return {};
    }
    try {
      return JSON.parse(state);
    } catch (e) {
      return {stateMessage: state};
    }
  }

  private async handleResponse(params: ResponseParams, redirectUri: URL) : Promise<LoginResult> {
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

  //TODO: Implement confidential clients
  private async handleCodeResponse(params: ResponseParams, redirectUrl: URL): Promise<LoginResult> {
    const payload = new HttpParams({encoder: this.encoder})
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

  private async handleTokenResponse(response: ResponseParams): Promise<LoginResult> {
    const accessToken = response.access_token ?? undefined;
    const idToken = response.id_token ?? undefined;
    const verifyResult = idToken ? await jwtVerify(idToken, header => this.getKey(header), {}) : undefined;
    this.validator.validate(verifyResult?.payload, verifyResult?.protectedHeader);
    const userInfo = verifyResult?.payload;
    const expiresIn = response.expires_in;
    const expiresAt = expiresIn ? new Date(Date.now() + parseInt(expiresIn)*1000) : undefined;
    const result = {
      isLoggedIn: true,
      accessToken: accessToken,
      idToken: idToken,
      expiresAt: expiresAt,
      userInfo: userInfo as UserInfo,
      redirectPath: response.finalUrl,
      stateMessage: response.stateMessage
    }
    console.log('Check result');
    console.log(idToken);
    console.log(userInfo);
    console.log(result);
    return result;
  }

  private async getKey(header: JWTHeaderParameters): Promise<KeyLike | Uint8Array> {
    const sigKeys = this.providerConfig!.publicKeys
      .filter(k => !header.alg || !k.alg || k.alg === header.alg)
      .filter(k => !k.use || k.use == 'sig')
    if (sigKeys.length === 0) {
      this.logger.error('No signature keys given');
      throw new Error('No valid signature key found');
    }
    if(!header.kid && sigKeys.length == 1) {
      return importJWK(sigKeys[0]);
    }
    if(!header.kid) {
      this.logger.error('Multiple signature keys but no kid keys given, take first');
      return importJWK(sigKeys[0]);
    }
    const keys = sigKeys
      .filter(k => k.kid === header.kid);
    if(keys.length == 0) {
      this.logger.error('No key with kid ' + header.kid + ' could be found in the key set');
      throw new Error('No valid key found');
    }
    return importJWK(keys[0]);
  }
  
  private handleErrorResponse(params: ResponseParams): Promise<LoginResult> {
    const error = params.error!;
    const description = params.error_description;
    const uri = params.error_uri;
    this.logger.info('Login failed',error, description, uri);
    throw new Error("Login failed: " + error);
  }

  public async login(loginOptions: LoginOptions): Promise<LoginResult> {
    const requestParams: RequestParams = {
      ...loginOptions,
      authEndpoint: this.providerConfig!.authEndpoint,
      clientId: this.clientConfig.clientId,
      nonce: this.createNonce(),
      redirectUri: this.clientConfig.redirectUri,
    };
    const url = this.createAuthenticationRequest(requestParams)
    this.logger.info('Start a login request to', url);
    this.window.location.href = url.toString();
    return new Promise<LoginResult>((_, reject) => setTimeout(() => reject("Browser should be redirected"), 1000));
  }

  private createAuthenticationRequest(requestMessage: RequestParams): URL {
    const url = new URL(requestMessage.authEndpoint);
    const state: State = {stateMessage: requestMessage.stateMessage, finalUrl: requestMessage.finalUrl};
    url.searchParams.append("response_type", requestMessage.response_type ?? ResponseType.AUTH_CODE_FLOE );
    url.searchParams.append("scope", requestMessage.scope?.join(" ") ?? "openid profile");
    url.searchParams.append("client_id", requestMessage.clientId);
    url.searchParams.append("state", JSON.stringify(state));
    url.searchParams.append("redirect_uri", requestMessage.redirectUri);
    if(requestMessage.nonce) {
      url.searchParams.append("nonce", requestMessage.nonce);
    }
    if(requestMessage.prompt) {
      url.searchParams.append("prompt", requestMessage.prompt);
    }
    if(requestMessage.ui_locales) {
      url.searchParams.append("ui_locales", requestMessage.ui_locales);
    }
    if(requestMessage.id_token_hint) {
      url.searchParams.append("id_token_hint", requestMessage.id_token_hint);
    }
    if(requestMessage.login_hint) {
      url.searchParams.append("login_hint", requestMessage.login_hint);
    }
    if(requestMessage.acr_values) {
      url.searchParams.append("acr_values", requestMessage.acr_values);
    }
    return url;
  }

  private createNonce(): string {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const nonce = array[0].toString();
    this.tokenStore.setString('nonce', nonce);
    return nonce;
  }

  public async silentLogin(loginOptions: LoginOptions): Promise<LoginResult> {
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
    const url = this.createAuthenticationRequest(requestParams)
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
    const params = this.parseResponseParams(e.data);
    this.handleResponse(params, redirectUrl).then(
      result => subject.next(result), 
      error => subject.error(error)
    );
  }

  //TODO: Implement single logout
  public async logout() {
    //Nothing to do here
  }
}
