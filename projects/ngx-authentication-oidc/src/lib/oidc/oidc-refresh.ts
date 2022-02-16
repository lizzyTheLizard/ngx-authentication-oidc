import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom, map } from 'rxjs';
import { AuthConfigService } from '../auth-config.service';
import { Logger } from '../configuration/oauth-config';
import { LoginResult } from '../helper/login-result';
import { CustomHttpParamEncoder } from '../helper/custom-http-param-encoder';
import { OidcResponse, Response } from './oidc-response';

@Injectable()
export class OidcRefresh {
  private readonly logger: Logger;
  private readonly encoder = new CustomHttpParamEncoder();

  constructor(
    private readonly httpClient: HttpClient,
    private readonly config: AuthConfigService,
    private readonly oidcResponse: OidcResponse
  ) {
    this.logger = this.config.loggerFactory('OidcRefresh');
  }

  public async tokenRefresh(oldLoginResult: LoginResult): Promise<LoginResult> {
    if (!oldLoginResult.refreshToken) {
      throw new Error('Could not refresh');
    }
    const payload = new HttpParams({ encoder: this.encoder })
      .set('client_id', this.config.client.clientId)
      .set('grant_type', 'refresh_token')
      .set('refresh_token', oldLoginResult.refreshToken);
    const tokenEndpoint = this.config.getProviderConfiguration().tokenEndpoint;
    return await firstValueFrom(
      this.httpClient.post(tokenEndpoint, payload).pipe(
        map((r) => this.mergeWithOldResult(r, oldLoginResult)),
        map((r) => this.oidcResponse.response(r))
      )
    );
  }

  private mergeWithOldResult(
    response: Response,
    oldLoginResult: LoginResult
  ): Response {
    return {
      ...response,
      refresh_token: response.refresh_token ?? oldLoginResult.refreshToken,
      id_token: response.id_token ?? oldLoginResult.idToken,
      session_state: response.session_state ?? oldLoginResult.sessionState
    };
  }
}
