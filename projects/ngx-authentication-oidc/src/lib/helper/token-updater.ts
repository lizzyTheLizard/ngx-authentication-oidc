import { Inject, Injectable } from '@angular/core';
import { WindowToken } from 'ngx-authentication-oidc';
import { Observable, Subject } from 'rxjs';
import { AuthConfigService } from '../auth-config.service';
import { TokenStoreWrapper } from './token-store-wrapper';
import { Logger } from '../configuration/oauth-config';
import { OidcSilentLogin } from '../oidc/oidc-silent-login';
import { OidcRefresh } from '../oidc/oidc-refresh';
import { LoginResult } from './login-result';

@Injectable()
export class TokenUpdater {
  public readonly updated$: Observable<LoginResult>;
  private readonly sessionUpdatedSub: Subject<LoginResult>;
  private updateInterval?: number;
  private readonly logger: Logger;

  constructor(
    private readonly tokenStore: TokenStoreWrapper,
    private readonly config: AuthConfigService,
    private readonly oidcSilentLogin: OidcSilentLogin,
    private readonly oidcRefresh: OidcRefresh,
    @Inject(WindowToken) private readonly window: Window
  ) {
    this.logger = this.config.loggerFactory('TokenUpdater');
    this.sessionUpdatedSub = new Subject();
    this.updated$ = this.sessionUpdatedSub.asObservable();
  }

  public startAutoUpdate() {
    if (!this.config.autoUpdate.enabled) {
      return;
    }
    const interval = this.config.autoUpdate.updateIntervalSeconds * 1000;
    this.updateInterval = this.window.setInterval(() => this.ping(), interval);
  }

  private ping() {
    if (!this.tokenNeedsToBeUpdated()) {
      return;
    }
    this.updateSession(true).then((res) => this.sessionUpdatedSub.next(res));
  }

  private tokenNeedsToBeUpdated(): boolean {
    const loginResult = this.tokenStore.getLoginResult();
    const exp = loginResult.expiresAt ?? new Date();
    const expIn = exp.valueOf() - Date.now();
    if (expIn >= this.config.autoUpdate.minimalValiditySeconds * 1000) {
      this.logger.debug('Token expires in ' + expIn + ', do not update yet');
      return false;
    }
    this.logger.debug('Token expires in ' + expIn + ', start update');
    return true;
  }

  public async updateSession(refreshToken: boolean): Promise<LoginResult> {
    const oldLoginResult = this.tokenStore.getLoginResult();
    if (!oldLoginResult.isLoggedIn) {
      this.logger.info('Try to update token, but user is not logged in...');
      return { isLoggedIn: false };
    }

    this.logger.debug('Try to update tokens');
    const useRefreshToken = refreshToken && oldLoginResult.refreshToken;
    const options = { id_token_hint: oldLoginResult.idToken };
    const loginResult = useRefreshToken
      ? await this.oidcRefresh.tokenRefresh(oldLoginResult)
      : await this.oidcSilentLogin.login(options);

    if (!loginResult.isLoggedIn) {
      this.logger.info('The user is not logged in any more');
      return loginResult;
    }

    if (oldLoginResult.userInfo!.sub !== loginResult.userInfo?.sub) {
      this.logger.info('User information has changed, user will be logged out');
      return { isLoggedIn: false };
    }

    this.logger.info('The session has been updated');
    return loginResult;
  }

  public stopAutoUpdate() {
    if (this.updateInterval) {
      this.window.clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }
  }
}
