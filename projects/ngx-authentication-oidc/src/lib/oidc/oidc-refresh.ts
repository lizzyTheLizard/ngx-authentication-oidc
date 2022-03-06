import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom, map } from 'rxjs';
import { AuthConfigService } from '../auth-config.service';
import { Logger } from '../configuration/oauth-config';
import { LoginResult } from '../login-result';
import { CustomHttpParamEncoder } from '../helper/custom-http-param-encoder';
import { OidcTokenResponse } from './oidc-token-response';
import { Response } from '../helper/response-parameter-parser';

@Injectable()
export class OidcRefresh {
  private readonly logger: Logger;
  private readonly encoder = new CustomHttpParamEncoder();

  constructor(
    private readonly httpClient: HttpClient,
    private readonly config: AuthConfigService,
    private readonly oidcTokenResponse: OidcTokenResponse
  ) {
    this.logger = this.config.loggerFactory('OidcRefresh');
  }

  public async tokenRefresh(oldLoginResult: LoginResult): Promise<LoginResult> {
    if (!oldLoginResult.refreshToken) {
      throw new Error('Could not refresh');
    }
    const payload = new HttpParams({ encoder: this.encoder })
      .set('client_id', this.config.clientId)
      .set('grant_type', 'refresh_token')
      .set('refresh_token', oldLoginResult.refreshToken);
    const tokenEndpoint = this.config.getProviderConfiguration().tokenEndpoint;
    return await firstValueFrom(
      this.httpClient
        .post<Response>(tokenEndpoint, payload)
        .pipe(map((r) => this.handleResponse(r, oldLoginResult)))
    );
  }

  private handleResponse(response: Response, oldResult: LoginResult): Promise<LoginResult> {
    const mergedResponse = {
      ...response,
      refresh_token: response.refresh_token ?? oldResult.refreshToken,
      id_token: response.id_token ?? oldResult.idToken,
      session_state: response.session_state ?? oldResult.sessionState
    };
    return this.oidcTokenResponse.response(mergedResponse);
  }
}
