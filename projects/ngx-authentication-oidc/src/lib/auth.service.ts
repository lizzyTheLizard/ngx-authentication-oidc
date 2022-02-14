import { Inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subject, map } from 'rxjs';
import { Initializer, InitializerInput } from './initializer/initializer';
import { AuthConfigService } from './auth-config.service';
import { LoginOptions } from './configuration/login-options';
import { Logger, LoggerFactory } from './logger/logger';
import { LoginResult, UserInfo } from './login-result';
import { OidcDiscovery } from './oidc/oidc-discovery';
import { OidcLogin } from './oidc/oidc-login';
import { OidcLogout } from './oidc/oidc-logout';
import { OidcSilentLogin } from './oidc/oidc-silent-login';
import { TokenStoreWrapper } from './token-store/token-store-wrapper';
// eslint-disable-next-line prettier/prettier
import { TimeoutHandler, TimeoutHandlerToken } from './timeout-handler/timeout-handler';
import { OidcResponse } from './oidc/oidc-response';
import { OidcSessionManagement } from './oidc/oidc-session-management';
import { LoggerFactoryToken } from './logger/logger';
import { InitializerToken } from './initializer/initializer';
import { TokenUpdater } from './token-updater';

/**
 * Main facade of the library, can be used to check and perform logins. Is available if you import {@link AuthenticationModule}.
 */
@Injectable()
export class AuthService {
  /** Observable to check if a user is currently logged in */
  public readonly isLoggedIn$: Observable<boolean>;
  /** Observable returning the user information of the currently logged in user or {@link undefined} if no user is logged in */
  public readonly userInfo$: Observable<UserInfo | undefined>;
  /** Promise returning  true as soon as the setup has finished */
  public readonly initialSetupFinished$: Promise<boolean>;

  private readonly logger: Logger;
  private readonly loginResult$: Subject<LoginResult>;
  private initialSetupFinishedResolve: (e: any) => void = () => {};

  constructor(
    private readonly oidcLogin: OidcLogin,
    private readonly oidcSilentLogin: OidcSilentLogin,
    private readonly oidcDiscovery: OidcDiscovery,
    private readonly oidcLogout: OidcLogout,
    private readonly oidcResponse: OidcResponse,
    private readonly sessionManagement: OidcSessionManagement,
    private readonly config: AuthConfigService,
    private readonly router: Router,
    private readonly tokenStore: TokenStoreWrapper,
    private readonly tokenUpdater: TokenUpdater,
    @Inject(LoggerFactoryToken) private readonly loggerFactory: LoggerFactory,
    @Inject(TimeoutHandlerToken)
    private readonly timeoutHandler: TimeoutHandler,
    @Inject(InitializerToken) private readonly initializer: Initializer
  ) {
    this.logger = loggerFactory('AuthService');

    //Set up initialSetupFinished promise
    this.initialSetupFinished$ = new Promise((resolve) => {
      this.initialSetupFinishedResolve = resolve;
    });

    //Set up Observables
    this.loginResult$ = new Subject();
    this.isLoggedIn$ = this.loginResult$.pipe(map((t) => t.isLoggedIn));
    this.userInfo$ = this.loginResult$.pipe(map((t) => t.userInfo));

    //Subscribe to others
    this.sessionManagement.changed$.subscribe(() => this.updateSession(false));
    this.tokenUpdater.updated$.subscribe((res) => this.sessionUpdated(res));
    this.timeoutHandler.timeout$.subscribe(() => this.logout());
  }

  private sessionUpdated(newLoginResult: LoginResult) {
    const oldLoginResult = this.tokenStore.getLoginResult();
    if (!newLoginResult.isLoggedIn) {
      this.logger.debug('The user is not logged in any more');
      this.logout();
      return;
    }
    this.logger.debug('The session has been updated');
    this.tokenStore.setLoginResult(newLoginResult);
    this.loginResult$.next(newLoginResult);
    if (oldLoginResult.sessionState !== newLoginResult.sessionState) {
      this.logger.debug('Session state has changed, watch new session');
      this.sessionManagement.startWatching();
    }
  }

  /**
   * Initialize the library, is called by {@link AuthenticationModule} and must not be called manually
   */
  public async initialize() {
    try {
      this.logger.debug('Start authentication module');
      await this.oidcDiscovery.discover();
      const initializerInput = this.createInitializerInput();
      const loginResult = await this.initializer(initializerInput);
      if (loginResult.isLoggedIn) {
        this.handleSuccessfulLoginResult(loginResult);
        this.logger.debug('Finished initialization, user is logged in');
      } else {
        this.logger.debug('Finished initialization, user is not logged in');
      }
    } catch (e) {
      this.logger.error('Could not initialize authentication module', e);
      this.router.navigateByUrl(this.config.errorUrl);
    }
    this.initialSetupFinishedResolve(true);
  }

  private createInitializerInput(): InitializerInput {
    const initial = this.tokenStore.getLoginResult() ?? { isLoggedIn: false };
    return {
      loggerFactory: this.loggerFactory,
      initialLoginResult: initial,
      login: (options: LoginOptions) =>
        this.oidcLogin.login({ ...options, finalUrl: this.router.url }),
      silentLogin: (options: LoginOptions) =>
        this.oidcSilentLogin.login({ ...options, finalUrl: this.router.url }),
      handleResponse: () => this.oidcResponse.handleURLResponse()
    };
  }

  /**
   * Start a manual login. After a successful login, the user will be redirected to the current page or {@link LoginOptions.finalUrl} if given.
   * @param loginOptions login options, check {@link LoginOptions}
   * @returns The returned promise will usually not resolve, as this triggers a redirect. If it does return, the value of the promise defines if the login was successful.
   */
  public async login(loginOptions: LoginOptions = {}): Promise<boolean> {
    const finalUrl = loginOptions.finalUrl ?? this.router.url;
    loginOptions = { ...loginOptions, finalUrl: finalUrl };
    const loginResult = await this.oidcLogin.login(loginOptions);
    if (loginResult.isLoggedIn) {
      this.handleSuccessfulLoginResult(loginResult);
    } else {
      this.logger.info('Login was not successful, user is not logged in');
    }
    return loginResult.isLoggedIn;
  }

  /**
   * Perform a silent login without redirect and user interaction. This is e.g. used to check if the user is already logged in or if the session is still present.
   * @param loginOptions login options, check {@link LoginOptions}
   * @returns A promise resolving to true if the login was successful and false otherwise
   */
  public async silentLogin(loginOptions: LoginOptions = {}): Promise<boolean> {
    const loginResult = await this.oidcSilentLogin.login(loginOptions);
    if (loginResult.isLoggedIn) {
      this.handleSuccessfulLoginResult(loginResult);
    } else {
      this.logger.info('Login was not successful, user is not logged in');
    }
    return loginResult.isLoggedIn;
  }

  private handleSuccessfulLoginResult(loginResult: LoginResult): void {
    this.tokenStore.setLoginResult(loginResult);
    this.loginResult$.next(loginResult);

    this.sessionManagement.startWatching();
    this.tokenUpdater.startAutoUpdate();
    this.timeoutHandler.start();

    const userInfo = this.getUserInfo();
    this.logger.info('Login was successful, user is logged in', userInfo);
    if (loginResult.redirectPath) {
      this.router.navigateByUrl(loginResult.redirectPath);
    }
  }

  /**
   * Logout the current user
   */
  public async logout(): Promise<void> {
    await this.initialSetupFinished$;

    this.tokenUpdater.startAutoUpdate();
    this.sessionManagement.stopWatching();
    this.timeoutHandler.stop();

    if (!this.isLoggedIn()) {
      this.logger.info('No logout is started as user is already logged out');
      return;
    }

    const userInfo = this.getUserInfo();
    this.logger.info('Log out user', userInfo);
    await this.oidcLogout.logout();

    const loginResult = { isLoggedIn: false };
    this.tokenStore.setLoginResult(loginResult);
    this.loginResult$.next(loginResult);

    if (this.config.logoutUrl) {
      this.logger.info('Redirect to', this.config.logoutUrl);
      this.router.navigateByUrl(this.config.logoutUrl);
    } else {
      this.logger.debug('Logged out, but no redirect URI is specified');
    }
  }

  /**
   * Update the access token, this will be triggered automatically
   * but can be triggered manually as well
   */
  public async updateSession(shouldUseRefreshToken?: boolean): Promise<void> {
    this.tokenUpdater.updateSession(shouldUseRefreshToken ?? true);
  }

  /**
   * Get the access token of the currently logged in user
   * @returns The access token of {@link undefined} if no user is logged in / he has no access token
   */
  public getAccessToken(): string | undefined {
    return this.tokenStore.getLoginResult().accessToken;
  }

  /**
   * Get the id token of the currently logged in user
   * @returns The id token of {@link undefined} if no user is logged in / he has no id token
   */
  public getIdToken(): string | undefined {
    return this.tokenStore.getLoginResult().idToken;
  }

  /**
   * Is a user currently logged in?
   * @returns True if a user is logged in false otherwise
   */
  public isLoggedIn(): boolean {
    return this.tokenStore.getLoginResult().isLoggedIn;
  }

  /**
   * Get the user information of the currently logged in user
   * @returns the parsed id token or undefined if no user is logged in / he has no id token
   */
  public getUserInfo(): UserInfo | undefined {
    return this.tokenStore.getLoginResult().userInfo;
  }

  /**
   * When does the current token expire
   * @returns Timestamp when the current session expires
   */
  public getExpiresAt(): Date | undefined {
    return this.tokenStore.getLoginResult().expiresAt;
  }
}
