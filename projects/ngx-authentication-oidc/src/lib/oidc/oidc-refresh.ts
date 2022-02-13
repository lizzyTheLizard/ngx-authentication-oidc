import { HttpClient, HttpParams } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { firstValueFrom, map } from 'rxjs';
import { AuthConfigService } from '../auth-config.service';
import { LoggerFactoryToken } from '../logger/logger';
import { Logger, LoggerFactory } from '../logger/logger';
import { LoginResult } from '../login-result';
import { CustomHttpParamEncoder } from './helper/custom-http-param-encoder';
import { OidcResponse, ResponseParams } from './oidc-response';

@Injectable()
export class OidcRefresh {
  private readonly logger: Logger;
  private readonly encoder = new CustomHttpParamEncoder();

  constructor(
    private readonly httpClient: HttpClient,
    private readonly config: AuthConfigService,
    private readonly oidcResponse: OidcResponse,
    @Inject(LoggerFactoryToken) loggerFactory: LoggerFactory
  ) {
    this.logger = loggerFactory('OidcRefresh');
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
        map((r) => this.oidcResponse.handleResponse(r))
      )
    );
  }

  private mergeWithOldResult(
    response: ResponseParams,
    oldLoginResult: LoginResult
  ): ResponseParams {
    return {
      ...response,
      refresh_token: response.refresh_token ?? oldLoginResult.refreshToken,
      id_token: response.id_token ?? oldLoginResult.idToken,
      session_state: response.session_state ?? oldLoginResult.sessionState
    };
  }
}
