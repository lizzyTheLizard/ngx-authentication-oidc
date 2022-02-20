import { Inject, Injectable } from '@angular/core';
import { AuthConfigService } from '../auth-config.service';
import { LoginOptions } from '../configuration/login-options';
import { Logger } from '../configuration/oauth-config';
import { LoginResult } from '../helper/login-result';
import { WindowToken } from '../authentication-module.tokens';
import { AuthenticationRequest } from '../helper/authentication-request';
import { Location } from '@angular/common';

@Injectable()
export class OidcLogin {
  private readonly logger: Logger;
  public readonly redirectUrl: URL;

  constructor(
    private readonly location: Location,
    private readonly config: AuthConfigService,
    @Inject(WindowToken) private readonly window: Window
  ) {
    this.logger = this.config.loggerFactory('OidcLogin');
    this.redirectUrl = this.getRedirectUrl();
  }

  public async login(loginOptions: LoginOptions): Promise<LoginResult> {
    this.logger.info('Perform login');
    const clientId = this.config.clientId;
    const authEndpoint = this.config.getProviderConfiguration().authEndpoint;
    const url = new AuthenticationRequest(
      loginOptions,
      this.redirectUrl.toString(),
      clientId,
      authEndpoint
    ).toUrl();
    this.logger.info('Start a login request to', url);
    this.window.location.href = url.toString();
    return new Promise<LoginResult>((_, reject) =>
      this.window.setTimeout(() => reject('Browser should be redirected'), 1000)
    );
  }

  private getRedirectUrl(): URL {
    const urlStr =
      this.config.redirectUri ?? this.location.prepareExternalUrl('');
    try {
      return new URL(urlStr);
    } catch (e) {
      const result = new URL(this.window.location.href);
      result.pathname = '';
      result.hash = '';
      result.search = '';
      this.logger.debug(
        'redirectUri and base href are both not set, use origin as redirect URI',
        result.toString()
      );
      return result;
    }
  }
}
