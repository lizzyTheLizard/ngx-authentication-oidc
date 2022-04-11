import { Inject, Injectable } from '@angular/core';
import { AuthConfigService } from './auth-config.service';
import { Logger } from './configuration/oauth-config';
import { OidcSilentLogin } from './oidc/oidc-silent-login';
import { OidcRefresh } from './oidc/oidc-refresh';
import { AuthService } from './auth.service';
import { LoginResult } from './login-result';
import { Observable, Subject } from 'rxjs';
import { WindowToken } from './authentication-module.tokens';
import { Idle } from '@ng-idle/core';
import { OidcSessionManagement, SessionWatch } from './oidc/oidc-session-management';

interface Listener {
  start(): void;
  stop(): void;
}

/**
 * Facade for the current session. Can be used to force update token
 * and listen to interactive warnings
 * Is available if you import {@link AuthenticationModule}.
 */
@Injectable()
export class SessionService {
  private readonly logger: Logger;
  private readonly sessionListeners: Listener[];
  private readonly secondsUntilTimeoutSub: Subject<number | undefined>;
  private isRunning: boolean = false;
  private watchSession?: SessionWatch;
  private autoUpdateInterval?: number;

  /** Observable to check for inactive timeout warnings */
  public readonly secondsUntilTimeout$: Observable<number | undefined>;

  constructor(
    private readonly config: AuthConfigService,
    private readonly authService: AuthService,
    @Inject(WindowToken) private readonly window: Window,
    private readonly oidcSilentLogin: OidcSilentLogin,
    private readonly oidcSessionManagement: OidcSessionManagement,
    private readonly idle: Idle,
    private readonly oidcRefresh: OidcRefresh
  ) {
    this.logger = this.config.loggerFactory('SessionManager');
    this.secondsUntilTimeoutSub = new Subject();
    this.secondsUntilTimeout$ = this.secondsUntilTimeoutSub.asObservable();
    this.sessionListeners = [];

    this.addIfDefined(this.setupTokenUpdater());
    this.addIfDefined(this.setupInactiveTimeout());
    this.addIfDefined(this.setupSessionChangedHandler());
    this.authService.isLoggedIn$.subscribe((loggedIn) => this.loggedInChanged(loggedIn));
  }

  private addIfDefined(listener?: Listener) {
    if (listener) {
      this.sessionListeners.push(listener);
    }
  }

  private setupTokenUpdater(): Listener | undefined {
    if (!this.config.autoUpdate.enabled) {
      this.logger.debug('Token AutoUpdate disabled');
      return;
    }
    this.logger.debug('Token AutoUpdate enabled');
    const start = () => {
      this.autoUpdateInterval = this.window.setInterval(() => {
        const exp = this.authService.getExpiresAt() ?? new Date();
        const expIn = exp.valueOf() - Date.now();
        if (expIn >= this.config.autoUpdate.minimalValiditySeconds * 1000) {
          this.logger.debug('Token expires in ' + expIn + ', do not update yet');
          return;
        }
        this.logger.debug('Token expires in ' + expIn + ', start update');
        this.updateToken(true);
      }, this.config.autoUpdate.updateIntervalSeconds * 1000);
    };
    const stop = () => {
      this.window.clearInterval(this.autoUpdateInterval);
      this.autoUpdateInterval = undefined;
    };
    return { start: start, stop: stop };
  }

  private setupInactiveTimeout(): Listener | undefined {
    if (!this.config.inactiveTimeout.enabled) {
      this.logger.debug('Inactive timeout is disabled');
      return;
    }
    this.logger.debug('Inactive timeout is enabled');
    this.idle.setIdleName('SessionManager');
    this.idle.setIdle(this.config.inactiveTimeout.idleTimeSeconds);
    this.idle.setTimeout(this.config.inactiveTimeout.timeoutSeconds);
    this.idle.setInterrupts(this.config.inactiveTimeout.interrupts);
    this.idle.onIdleStart.subscribe(() => this.logger.debug('User is idle'));
    this.idle.onIdleEnd.subscribe(() => {
      this.logger.debug('User is not idle any more');
      this.secondsUntilTimeoutSub.next(undefined);
    });
    this.idle.onTimeoutWarning.subscribe((secondsLeft) => {
      this.logger.debug('User is idle, you will be logged out in ' + secondsLeft + ' seconds');
      this.secondsUntilTimeoutSub.next(secondsLeft);
    });
    this.idle.onTimeout.subscribe(() => {
      this.logger.debug('User will be logged out as he was idle to long');
      this.authService.logout(this.config.inactiveTimeout.timeoutAction);
    });

    const start = () => {
      this.idle.watch();
    };
    const stop = () => {
      this.idle.stop();
    };
    return { start: start, stop: stop };
  }

  private setupSessionChangedHandler(): Listener | undefined {
    if (!this.config.sessionManagement.enabled) {
      this.logger.debug('Session Management is disabled');
      return;
    }
    this.logger.debug('Session Management is enabled');

    const start = () => {
      const sessionState = this.authService.getLoginResult().sessionState;
      if (!sessionState) {
        this.logger.info('Provider does not support session management, no session state returned');
        return;
      }
      this.watchSession = this.oidcSessionManagement.watchSession(sessionState);
      this.watchSession.subscribe(() => this.updateToken!(false));
    };
    const stop = () => {
      if (!this.watchSession) {
        return;
      }
      this.oidcSessionManagement.stopWatching(this.watchSession!);
    };
    return { start: start, stop: stop };
  }

  private loggedInChanged(isLoggedIn: boolean) {
    if (isLoggedIn && !this.isRunning) {
      this.sessionListeners.forEach((x) => x.start());
      this.isRunning = true;
      return;
    }

    if (!isLoggedIn && this.isRunning) {
      this.sessionListeners.forEach((x) => x.stop());
      this.isRunning = false;
    }
  }

  /**
   * Force update the token of the current session
   * @param {boolean} shouldUseRefreshToken Should the refresh token be used, true by default
   * @returns {Promise<void>} Promise that resolves when the update has finished
   */
  public async updateToken(shouldUseRefreshToken?: boolean): Promise<void> {
    const oldLoginResult = this.authService.getLoginResult();
    const refreshToken = shouldUseRefreshToken ?? true;
    const newLoginResult = await this.getNewTokens(refreshToken, oldLoginResult);

    if (!newLoginResult.isLoggedIn) {
      this.logger.debug('The user is not logged in any more');
      this.authService.logout(this.config.inactiveTimeout.timeoutAction);
      return;
    }
    if (oldLoginResult.userInfo!.sub !== newLoginResult.userInfo?.sub) {
      this.logger.info('User information has changed, user will be logged out');
      this.authService.logout(this.config.inactiveTimeout.timeoutAction);
    }
    this.logger.debug('The session has been updated');
    await this.authService.setLoginResult(newLoginResult);
  }

  private async getNewTokens(useRefresh: boolean, oldResult: LoginResult): Promise<LoginResult> {
    this.logger.debug('Try to update tokens');
    useRefresh = useRefresh && !!oldResult.refreshToken;
    const options = { id_token_hint: oldResult.idToken };
    return useRefresh
      ? await this.oidcRefresh.tokenRefresh(oldResult)
      : await this.oidcSilentLogin.login(options);
  }
}
