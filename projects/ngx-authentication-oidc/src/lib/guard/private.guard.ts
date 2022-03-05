import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthConfigService } from '../auth-config.service';
import { AuthService } from '../auth.service';
import { Logger } from '../configuration/oauth-config';

@Injectable()
export class PrivateGuard implements CanActivate {
  private readonly logger: Logger;
  constructor(
    private readonly config: AuthConfigService,
    private readonly auth: AuthService,
    private readonly router: Router
  ) {
    this.logger = config.loggerFactory('PrivateGuard');
  }

  async canActivate(): Promise<boolean | UrlTree> {
    // First wait until library is full loaded, guard could be activated before that
    await this.auth.initialSetupFinished$;
    const isLoggedIn = this.auth.isLoggedIn();
    if (isLoggedIn) {
      this.logger.debug('User is logged in, can access page');
      return true;
    }
    this.logger.info('User is not logged in, cannot access page');
    return this.router.parseUrl(this.config.notAllowedUri);
  }
}
