import { HttpClient, HttpParameterCodec, HttpParams } from "@angular/common/http";
import { Inject, Injectable } from "@angular/core";
import { importJWK, JWTHeaderParameters, jwtVerify, KeyLike } from "jose";
import { catchError, firstValueFrom, map } from "rxjs";
import { AuthConfigService } from "../auth-config.service";
import { WindowToken } from "../authentication-module.tokens";
import { LoggerFactoryToken } from "../logger/logger";
import { Logger, LoggerFactory } from "../logger/logger";
import { LoginResult, UserInfo } from "../login-result";
import { State } from "./oidc-login";
import { OidcValidator } from "./oidc-validator";

export interface ResponseParams extends State {
  error_description?: string;
  error_uri?: string;
  expires_in?: string;
  error?: string;
  code?: string;
  id_token?: string;
  access_token?: string;
  session_state?: string;
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

@Injectable()
export class OidcResponse {
  private readonly logger: Logger;
  private readonly encoder = new CustomHttpParamEncoder();

  constructor(
      private readonly httpClient: HttpClient,
      private readonly config: AuthConfigService,
      private readonly validator: OidcValidator,
      @Inject(WindowToken) private readonly window: Window,
      @Inject(LoggerFactoryToken) private readonly loggerFactory: LoggerFactory){
    this.logger = loggerFactory('OidcResponse');
  }

  public isResponse(){
    const currentUrl = new URL(this.window.location.href);
    const redirectUrl = new URL(this.config.client.redirectUri);
    if(currentUrl.pathname === redirectUrl.pathname){
      return true;
    }
    this.logger.debug('This is not a redirect as URL', currentUrl,' is not redirect url', redirectUrl);
    return false;
  }

  public getResponseParamsFromQueryString(): ResponseParams {
    const currentUrl = new URL(this.window.location.href);
    return this.parseResponseParams(currentUrl.hash ? currentUrl.hash.substr(1): currentUrl.search);
  }

  public parseResponseParams(queryString: string): ResponseParams  {
    const urlSearchParams = new URLSearchParams(queryString);
    const state = this.parseResponseState(urlSearchParams.get('state'));
    const ret = {...state};
    this.addIfGiven(ret, 'error_description', urlSearchParams);
    this.addIfGiven(ret, 'error_uri', urlSearchParams);
    this.addIfGiven(ret, 'expires_in', urlSearchParams);
    this.addIfGiven(ret, 'error', urlSearchParams);
    this.addIfGiven(ret, 'code', urlSearchParams);
    this.addIfGiven(ret, 'id_token', urlSearchParams);
    this.addIfGiven(ret, 'access_token', urlSearchParams);
    this.addIfGiven(ret, 'session_state', urlSearchParams);
    return ret;
  }

  private addIfGiven(obj: any, key: string, params: URLSearchParams) {
    if(params.has(key)) {
      obj[key] = params.get(key);
    }
  }

  public async handleResponse(params: ResponseParams, redirectUrl?: URL) : Promise<LoginResult> {
    if(!redirectUrl) {
      redirectUrl = new URL(this.config.client.redirectUri);
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
      return this.handleCodeResponse(params, redirectUrl);
    }
    if(hasToken) {
      return this.handleTokenResponse(params);
    }
    this.logger.debug('This is not a redirect as URL as no return params can be detected');
    return {isLoggedIn: false};
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
        
  //TODO: Implement confidential clients
  private async handleCodeResponse(params: ResponseParams, redirectUrl: URL): Promise<LoginResult> {
    const payload = new HttpParams({encoder: this.encoder})
      .set('client_id', this.config.client.clientId)
      .set('grant_type', 'authorization_code')
      .set('code', params.code!)
      .set('redirect_uri', redirectUrl.toString());
    const tokenEndpoint = this.config.getProviderConfiguration().tokenEndpoint;
    const tokenResponse = await firstValueFrom(this.httpClient.post(tokenEndpoint, payload).pipe(
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
    
  //TODO: UserInfo Endpoint (Chapter 5.3, https://openid.net/specs/openid-connect-core-1_0.html)
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
      stateMessage: response.stateMessage,
      sessionState: response.session_state,
    }
    return result;
  }
    
  private async getKey(header: JWTHeaderParameters): Promise<KeyLike | Uint8Array> {
    const publicKeys = this.config.getProviderConfiguration().publicKeys;
    const sigKeys = publicKeys
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
    this.logger.debug('Login failed',error, description, uri);
    return Promise.reject("Login failed: " + error);
  }
}
