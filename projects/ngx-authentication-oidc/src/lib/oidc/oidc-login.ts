import { Inject, Injectable } from '@angular/core';
import { AuthConfigService } from '../auth-config.service';
import { LoginOptions } from '../configuration/login-options';
import { Logger } from '../configuration/oauth-config';
import { LoginResult } from '../helper/login-result';
import { WindowToken } from '../authentication-module.tokens';
import { AuthenticationRequest } from '../helper/authentication-request';
import { LocalUrl } from '../helper/local-url';

@Injectable()
export class OidcLogin {
  private readonly logger: Logger;

  constructor(
    private readonly config: AuthConfigService,
    private readonly localUrl: LocalUrl,
    @Inject(WindowToken) private readonly window: Window
  ) {
    this.logger = this.config.loggerFactory('OidcLogin');
  }

  public getRedirectUrl(): URL {
    return this.config.redirectUri
      ? new URL(this.config.redirectUri)
      : this.localUrl.getLocalUrl('');
  }

  public async login(loginOptions: LoginOptions): Promise<LoginResult> {
    this.logger.info('Perform login');
    const clientId = this.config.clientId;
    const authEndpoint = this.config.getProviderConfiguration().authEndpoint;
    const url = new AuthenticationRequest(
      loginOptions,
      this.getRedirectUrl().toString(),
      clientId,
      authEndpoint
    ).toUrl();
    this.logger.info('Start a login request to', url);
    this.window.location.href = url.toString();
    return new Promise<LoginResult>((_, reject) =>
      this.window.setTimeout(() => reject('Browser should be redirected'), 1000)
    );
  }
}
