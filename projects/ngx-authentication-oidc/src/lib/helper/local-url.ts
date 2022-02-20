import { Location } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { AuthConfigService } from '../auth-config.service';
import { WindowToken } from '../authentication-module.tokens';
import { Logger } from '../configuration/oauth-config';

@Injectable()
export class LocalUrl {
  private readonly logger: Logger;

  constructor(
    private readonly config: AuthConfigService,
    private readonly location: Location,
    @Inject(WindowToken) private readonly window: Window
  ) {
    this.logger = this.config.loggerFactory('OidcLogout');
  }

  public getLocalUrl(relative: string): URL {
    try {
      return new URL(this.location.prepareExternalUrl(relative));
    } catch (e) {
      const result = new URL(this.window.location.href);
      result.pathname = relative;
      result.hash = '';
      result.search = '';
      this.logger.debug('href is not set, use origin', result);
      return result;
    }
  }
}
