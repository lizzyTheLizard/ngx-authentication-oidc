import { Inject, Injectable } from '@angular/core';
import { AuthConfigService } from '../auth-config.service';
import { LoginOptions } from '../configuration/login-options';
import { Logger } from '../configuration/oauth-config';
import { LoginResult } from '../login-result';
import { WindowToken } from '../authentication-module.tokens';
import { OidcAuthenticationRequest } from './oidc-authentication-request';
import { UrlHelper } from '../helper/url-helper';

@Injectable()
export class OidcLogin {
  private readonly logger: Logger;

  constructor(
    private readonly config: AuthConfigService,
    private readonly urlHelper: UrlHelper,
    private readonly authenticationRequest: OidcAuthenticationRequest,
    @Inject(WindowToken) private readonly window: Window
  ) {
    this.logger = this.config.loggerFactory('OidcLogin');
  }

  public getRedirectUrl(): URL {
    return this.config.redirectUri
      ? new URL(this.config.redirectUri)
      : this.urlHelper.convertToAbsoluteUrl('');
  }

  public async login(loginOptions: LoginOptions): Promise<LoginResult> {
    this.logger.info('Perform login');
    const url = await this.authenticationRequest.generateRequest(
      loginOptions,
      this.getRedirectUrl().toString()
    );
    const urlStr = url.toString();
    this.logger.info('Start a login request to', urlStr);
    this.window.location.href = urlStr;
    return new Promise<LoginResult>((_, reject) =>
      this.window.setTimeout(() => reject('Browser should be redirected'), 1000)
    );
  }
}
