import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthConfigService } from '../auth-config.service';
import { Logger } from '../configuration/oauth-config';
import { LoginResult } from '../login-result';
import { CustomHttpParamEncoder } from '../helper/custom-http-param-encoder';
import { OidcTokenResponse } from './oidc-token-response';
import { Response, ResponseParameterParser } from '../helper/response-parameter-parser';
import { TokenStoreWrapper } from '../helper/token-store-wrapper';

@Injectable()
export class OidcCodeResponse {
  private readonly logger: Logger;
  private readonly encoder = new CustomHttpParamEncoder();
  private readonly responseParameterParser: ResponseParameterParser = new ResponseParameterParser();

  constructor(
    private readonly httpClient: HttpClient,
    private readonly config: AuthConfigService,
    private readonly oidcTokenResponse: OidcTokenResponse,
    private readonly tokenStoreWrapper: TokenStoreWrapper
  ) {
    this.logger = this.config.loggerFactory('OidcCodeResponse');
  }

  public async response(params: Response, redirect: URL): Promise<LoginResult> {
    this.oidcTokenResponse.handleErrorResponse(params);
    this.handleNonCodeResponse(params);
    const response = await this.performTokenRequest(params, redirect);
    const loginResult = await this.oidcTokenResponse.response(false, response);
    return {
      ...loginResult,
      // The result from the first state is relevant, so overwrite this here...
      finalRoute: params.finalRoute,
      stateMessage: params.stateMessage
    };
  }

  private handleNonCodeResponse(params: Response) {
    const hasCode = !!params.code;
    if (!hasCode) {
      throw new Error('This is not a code response');
    }
  }

  private async performTokenRequest(params: Response, redirect: URL) {
    let payload = new HttpParams({ encoder: this.encoder })
      .set('client_id', this.config.clientId)
      .set('grant_type', 'authorization_code')
      .set('code', params.code!)
      .set('redirect_uri', redirect.toString());
    const verifier = this.tokenStoreWrapper.getStoredVerifier();
    if (verifier) {
      payload = payload.set('code_verifier', verifier);
    }
    const tokenEndpoint = this.config.getProviderConfiguration().tokenEndpoint;
    const resp = await firstValueFrom(this.httpClient.post(tokenEndpoint, payload));
    return this.responseParameterParser.parseBody(resp);
  }
}
