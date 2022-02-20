import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, concatMap, firstValueFrom, map } from 'rxjs';
import { AuthConfigService } from '../auth-config.service';
import { Logger } from '../configuration/oauth-config';
import { LoginResult } from '../helper/login-result';
import { CustomHttpParamEncoder } from '../helper/custom-http-param-encoder';
import { State } from '../helper/state';
import { OidcTokenValidator } from './oidc-token-validator';

export interface Response extends State {
  error_description?: string;
  error_uri?: string;
  expires_in?: string;
  error?: string;
  code?: string;
  id_token?: string;
  access_token?: string;
  refresh_token?: string;
  session_state?: string;
}

@Injectable()
export class OidcResponse {
  private readonly logger: Logger;
  private readonly encoder = new CustomHttpParamEncoder();

  constructor(
    private readonly httpClient: HttpClient,
    private readonly config: AuthConfigService,
    private readonly tokenValidator: OidcTokenValidator
  ) {
    this.logger = this.config.loggerFactory('OidcResponse');
  }

  public urlResponse(url: URL, redirect: URL): Promise<LoginResult> {
    if (url.pathname !== redirect.pathname) {
      this.logger.debug('Current URL is not redirectURL', url, redirect);
      return Promise.resolve({ isLoggedIn: false });
    }

    const queryString = url.hash ? url.hash.substr(1) : url.search;
    const params = this.parseResponseParams(queryString);
    this.logger.debug('Got silent refresh response', params);
    return this.response(params, redirect);
  }

  public async response(param: Response, redirect: URL): Promise<LoginResult> {
    if (param.error) {
      return this.handleErrorResponse(param);
    }
    const hasCode = !!param.code;
    const hasToken = param.id_token || param.access_token;
    if (hasCode && hasToken) {
      throw new Error('Login failed: Hybrid Flow not supported');
    }
    if (hasCode) {
      return this.codeResponse(param, redirect);
    }
    if (hasToken) {
      return this.tokenResponse(param);
    }
    this.logger.debug(
      'This is not a redirect as URL as no return params can be detected'
    );
    return Promise.resolve({ isLoggedIn: false });
  }

  private parseResponseParams(queryString: string): Response {
    const urlSearchParams = new URLSearchParams(queryString);
    const state = this.parseResponseState(urlSearchParams.get('state'));
    const ret = { ...state };
    this.addIfGiven(ret, 'error_description', urlSearchParams);
    this.addIfGiven(ret, 'error_uri', urlSearchParams);
    this.addIfGiven(ret, 'expires_in', urlSearchParams);
    this.addIfGiven(ret, 'error', urlSearchParams);
    this.addIfGiven(ret, 'code', urlSearchParams);
    this.addIfGiven(ret, 'id_token', urlSearchParams);
    this.addIfGiven(ret, 'access_token', urlSearchParams);
    this.addIfGiven(ret, 'refresh_token', urlSearchParams);
    this.addIfGiven(ret, 'session_state', urlSearchParams);
    return ret;
  }

  private addIfGiven(obj: any, key: string, params: URLSearchParams) {
    if (params.has(key)) {
      obj[key] = params.get(key);
    }
  }

  // TODO: Implement confidential clients
  private codeResponse(params: Response, redirect: URL): Promise<LoginResult> {
    const payload = new HttpParams({ encoder: this.encoder })
      .set('client_id', this.config.clientId)
      .set('grant_type', 'authorization_code')
      .set('code', params.code!)
      .set('redirect_uri', redirect.toString());
    const tokenEndpoint = this.config.getProviderConfiguration().tokenEndpoint;
    return firstValueFrom(
      this.httpClient.post(tokenEndpoint, payload).pipe(
        concatMap((r) => this.tokenResponse(r)),
        map((r) => {
          return {
            ...r,
            // The result from the first state is relevant, so overwrite this here...
            redirectPath: params.finalUrl,
            stateMessage: params.stateMessage
          };
        }),
        catchError((e) => this.handleErrorResponse(e.error))
      )
    );
  }

  private parseResponseState(state: string | null): State {
    if (!state) {
      return {};
    }
    try {
      return JSON.parse(state);
    } catch (e) {
      return { stateMessage: state };
    }
  }

  // TODO: UserInfo Endpoint (Chapter 5.3, https://openid.net/specs/openid-connect-core-1_0.html)
  public async tokenResponse(response: Response): Promise<LoginResult> {
    const idToken = response.id_token ?? undefined;
    // TODO: Verify nonce
    const userInfo = await this.tokenValidator.verify(idToken);
    const expiresIn = response.expires_in;
    const expiresAt = expiresIn
      ? new Date(Date.now() + parseInt(expiresIn) * 1000)
      : undefined;
    const result = {
      isLoggedIn: true,
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      idToken: idToken,
      expiresAt: expiresAt,
      userInfo: userInfo,
      redirectPath: response.finalUrl,
      stateMessage: response.stateMessage,
      sessionState: response.session_state
    };
    return result;
  }

  public handleErrorResponse(params: Response): Promise<LoginResult> {
    const error = params.error!;
    const description = params.error_description;
    const uri = params.error_uri;
    this.logger.info('Login failed', error, description, uri);
    return Promise.reject(new Error('Login failed: ' + error));
  }
}
