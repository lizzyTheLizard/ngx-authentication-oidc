import { Inject, Injectable } from '@angular/core';
import { AuthConfigService } from '../auth-config.service';
import { WindowToken } from '../authentication-module.tokens';
import { Logger } from '../configuration/oauth-config';
import { UrlHelper } from '../helper/url-helper';

@Injectable()
export class OidcLogout {
  private readonly logger: Logger;

  constructor(
    private readonly config: AuthConfigService,
    private readonly localUrl: UrlHelper,
    @Inject(WindowToken) private readonly window: Window
  ) {
    this.logger = this.config.loggerFactory('OidcLogout');
  }

  public async logout(idToken?: string, redirect?: string): Promise<boolean> {
    const endpoint = this.config.getProviderConfiguration().endSessionEndpoint;
    if (!this.config.silentLogin.enabled) {
      this.logger.info('Single logout disabled');
      return false;
    }
    if (!endpoint) {
      this.logger.info('Single logout not supported by authentication server');
      return false;
    }
    const url = new URL(endpoint);
    if (idToken) {
      url.searchParams.set('id_token_hint', idToken);
    }
    redirect = redirect ?? this.localUrl.convertToAbsoluteUrl('').toString();
    url.searchParams.set('post_logout_redirect_uri', redirect);
    this.logger.info('Start a logout request to', url);
    this.window.location.href = url.toString();

    return new Promise<boolean>((_, reject) =>
      this.window.setTimeout(() => reject('Browser should be redirected'), 1000)
    );
  }
}
