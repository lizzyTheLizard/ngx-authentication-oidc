import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthConfigService } from '../auth-config.service';
import { Logger, UserInfoSource } from '../configuration/oauth-config';
import { LoginResult, UserInfo } from '../login-result';
import { OidcTokenValidator } from './oidc-token-validator';
import { TokenStoreWrapper } from '../helper/token-store-wrapper';
import { Injectable } from '@angular/core';
import { Response } from '../helper/response-parameter-parser';

@Injectable()
export class OidcTokenResponse {
  private readonly logger: Logger;

  constructor(
    private readonly httpClient: HttpClient,
    private readonly config: AuthConfigService,
    private readonly tokenStore: TokenStoreWrapper,
    private readonly tokenValidator: OidcTokenValidator
  ) {
    this.logger = this.config.loggerFactory('OidcTokenResponse');
  }

  public async response(params: Response): Promise<LoginResult> {
    this.handleErrorResponse(params);
    this.handleNonTokenResponse(params);
    const userInfoFromToken = await this.verifyIdToken(params);
    const userInfo = await this.checkUserInfo(params, userInfoFromToken);
    return this.getLoginResult(params, userInfo);
  }

  public handleErrorResponse(params: Response) {
    if (!params.error) {
      return;
    }
    let errorMessage = 'Login failed: ' + params.error;
    if (params.error_description) {
      errorMessage += '. ' + params.error_description;
    }
    if (params.error_uri) {
      (errorMessage += '. See '), params.error_uri;
    }
    this.logger.info(errorMessage);
    throw Error('Login failed: ' + params.error);
  }

  private handleNonTokenResponse(params: Response) {
    const hasToken = params.id_token || params.access_token;
    if (!hasToken) {
      throw new Error('This is not a token response');
    }
  }

  private async verifyIdToken(params: Response): Promise<UserInfo | undefined> {
    const idToken = params.id_token ?? undefined;
    if (!idToken) {
      return;
    }
    const nonce = this.tokenStore.getStoredNonce();
    const accessToken = params.access_token ?? undefined;
    return this.tokenValidator.verify(idToken, nonce, accessToken);
  }

  private async checkUserInfo(params: Response, current?: UserInfo): Promise<UserInfo | undefined> {
    const source = this.config.userInfoSource;
    switch (source) {
      case UserInfoSource.TOKEN:
        this.logger.debug(source + ' => use id token');
        return current;
      case UserInfoSource.TOKEN_THEN_USER_INFO_ENDPOINT:
        if (current) {
          this.logger.debug(source + ' and token given => use token');
          return current;
        }
        this.logger.debug(source + ' and no token given => use endpoint');
        return this.userInfoRequest(params.access_token!);
      case UserInfoSource.USER_INFO_ENDPOINT:
        this.logger.debug(source + ' => use endpoint');
        return await this.userInfoRequest(params.access_token!);
      default:
        throw new Error('Invalid source ' + source);
    }
  }

  private async userInfoRequest(accessToken: String): Promise<UserInfo | undefined> {
    const endpoint = this.config.getProviderConfiguration().userInfoEndpoint;
    if (!endpoint) {
      this.logger.info('No endpoint given, cannot get user information');
      return;
    }
    const options = {
      headers: new HttpHeaders({
        Authorization: 'Bearer ' + accessToken
      })
    };
    return firstValueFrom(this.httpClient.post<UserInfo>(endpoint, null, options)).catch((e) => {
      this.logger.error('Invalid response, cannot get user information', e);
      return undefined;
    });
  }

  private getLoginResult(params: Response, userInfo?: UserInfo): LoginResult {
    const expiresIn = params.expires_in;
    const expiresAt = expiresIn ? new Date(Date.now() + parseInt(expiresIn) * 1000) : undefined;
    const result = {
      isLoggedIn: true,
      accessToken: params.access_token,
      refreshToken: params.refresh_token,
      idToken: params.id_token,
      expiresAt: expiresAt,
      userInfo: userInfo,
      redirectPath: params.finalUrl,
      stateMessage: params.stateMessage,
      sessionState: params.session_state
    };
    return result;
  }
}
