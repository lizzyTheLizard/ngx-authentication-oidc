import { Inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { AuthConfigService } from './auth-config.service';
import { LoginOptions } from './configuration/login-options';
import { LogoutAction } from './configuration/oauth-config';
import { InitializerInput, Logger } from './configuration/oauth-config';
import { LoginResult, UserInfo } from './login-result';
import { OidcDiscovery } from './oidc/oidc-discovery';
import { OidcLogin } from './oidc/oidc-login';
import { OidcLogout } from './oidc/oidc-logout';
import { OidcSilentLogin } from './oidc/oidc-silent-login';
import { TokenStoreWrapper } from './helper/token-store-wrapper';
import { WindowToken } from './authentication-module.tokens';
import { LogoutActionInput } from './configuration/oauth-config';
import { ResponseParameterParser } from './helper/response-parameter-parser';
import { OidcTokenResponse } from './oidc/oidc-token-response';
import { OidcCodeResponse } from './oidc/oidc-code-response';

/**
 * Main facade of the library, can be used to check and perform logins.
 * Is available if you import {@link AuthenticationModule}.
 */
@Injectable()
export class AuthService {
  private readonly logger: Logger;
  private readonly loginResult$: BehaviorSubject<LoginResult>;
  private readonly responseParameterParser: ResponseParameterParser = new ResponseParameterParser();
  private initialSetupFinishedResolve: (e: any) => void = () => {};

  /** Observable to check if a user is currently logged in */
  public readonly isLoggedIn$: Observable<boolean>;

  /**
   * Observable returning the user information of the currently logged in user
   * or {@link undefined} if no user is logged in
   */
  public readonly userInfo$: Observable<UserInfo | undefined>;

  /** Promise returning true as soon as the setup has finished */
  public readonly initialSetupFinished$: Promise<boolean>;

  constructor(
    private readonly oidcLogin: OidcLogin,
    private readonly oidcSilentLogin: OidcSilentLogin,
    private readonly oidcDiscovery: OidcDiscovery,
    private readonly oidcLogout: OidcLogout,
    private readonly oidcTokenResponse: OidcTokenResponse,
    private readonly oidcCodeResponse: OidcCodeResponse,
    private readonly config: AuthConfigService,
    private readonly router: Router,
    private readonly tokenStore: TokenStoreWrapper,
    @Inject(WindowToken) private readonly window: Window
  ) {
    this.logger = this.config.loggerFactory('AuthService');

    // Set up initialSetupFinished promise
    this.initialSetupFinished$ = new Promise((resolve) => {
      this.initialSetupFinishedResolve = resolve;
    });

    // Set up Observables
    this.loginResult$ = new BehaviorSubject<LoginResult>({ isLoggedIn: false });
    this.isLoggedIn$ = this.loginResult$.pipe(map((t) => t.isLoggedIn));
    this.userInfo$ = this.loginResult$.pipe(map((t) => t.userInfo));
  }

  /**
   * Initialize the library, is called by {@link AuthenticationModule}
   * and must not be called manually
   */
  public async initialize() {
    try {
      this.logger.debug('Start authentication module');
      await this.oidcDiscovery.discover();
      const initializerInput = this.createInitializerInput();
      const loginResult = await this.config.initializer(initializerInput);
      this.setLoginResult(loginResult);
      if (loginResult.isLoggedIn) {
        this.logger.debug('Finished initialization, user is logged in');
      } else {
        this.logger.debug('Finished initialization, user is not logged in');
      }
    } catch (e) {
      this.logger.error('Could not initialize authentication module', e);
      const input = {
        error: e,
        loggerFactory: this.config.loggerFactory,
        router: this.router
      };
      this.setLoginResult({ isLoggedIn: false });
      this.config.initializationErrorAction(input);
    }
    this.initialSetupFinishedResolve(true);
  }

  private createInitializerInput(): InitializerInput {
    const initial = this.tokenStore.getLoginResult() ?? { isLoggedIn: false };

    return {
      loggerFactory: this.config.loggerFactory,
      initialLoginResult: initial,
      login: (options: LoginOptions) =>
        this.oidcLogin.login({ ...options, finalUrl: this.router.url }),
      silentLogin: (options: LoginOptions) =>
        this.oidcSilentLogin.login({ ...options, finalUrl: this.router.url }),
      handleResponse: () => this.handleResponse(),
      isErrorResponse: () => this.isErrorResponse()
    };
  }

  private handleResponse(): Promise<LoginResult> {
    const current = new URL(this.window.location.href);
    const redirect = this.oidcLogin.getRedirectUrl();
    if (current.pathname !== redirect.pathname) {
      this.logger.debug('Current URL is not redirectURL', current, redirect);
      return Promise.resolve({ isLoggedIn: false });
    }
    const params = this.responseParameterParser.parseUrl(current);
    if (params.code) {
      return this.oidcCodeResponse.response(params, redirect);
    }
    if (params.id_token || params.access_token) {
      return this.oidcTokenResponse.response(true, params);
    }
    if (params.error) {
      try {
        this.oidcTokenResponse.handleErrorResponse(params);
      } catch (e) {
        this.logger.debug('If this was a login response, it has failed', e);
      }
    }
    return Promise.resolve({ isLoggedIn: false });
  }

  private isErrorResponse(): boolean {
    const current = new URL(this.window.location.href);
    const redirect = this.oidcLogin.getRedirectUrl();
    if (current.pathname !== redirect.pathname) {
      this.logger.debug('Current URL is not redirectURL', current, redirect);
      return false;
    }
    const params = this.responseParameterParser.parseUrl(current);
    return !!params.error;
  }

  /**
   * Start a manual login. After a successful login, the user will be redirected to the
   * current page or {@link LoginOptions.finalUrl} if given.
   * @param {LoginOptions} loginOptions login options, check {@link LoginOptions}
   * @returns {Promise<boolean>} The returned promise will usually not resolve,
   *   as this triggers a redirect. If it does return, the value of the promise defines
   *   if the login was successful.
   */
  public async login(loginOptions: LoginOptions = {}): Promise<boolean> {
    loginOptions = {
      ...loginOptions,
      id_token_hint: loginOptions.id_token_hint ?? this.getIdToken(),
      finalUrl: loginOptions.finalUrl ?? this.router.url
    };
    const loginResult = await this.oidcLogin.login(loginOptions);
    if (loginResult.isLoggedIn) {
      this.setLoginResult(loginResult);
    } else {
      this.logger.info('Login was not successful, user is not logged in');
    }
    return loginResult.isLoggedIn;
  }

  /**
   * Perform a silent login without redirect and user interaction.
   * This is e.g. used to check if the user is already logged in or if the session is still present.
   * @param {LoginOptions}  loginOptions login options, check {@link LoginOptions}
   * @returns {Promise<boolean>} Resolving to true if the login was successful and false otherwise
   */
  public async silentLogin(loginOptions: LoginOptions = {}): Promise<boolean> {
    loginOptions = {
      ...loginOptions,
      id_token_hint: loginOptions.id_token_hint ?? this.getIdToken()
    };
    const loginResult = await this.oidcSilentLogin.login(loginOptions);
    if (loginResult.isLoggedIn) {
      this.setLoginResult(loginResult);
    } else {
      this.logger.info('Login was not successful, user is not logged in');
    }
    return loginResult.isLoggedIn;
  }

  /**
   * Set a specific login result. Usually this will only be used internally,
   * but you can use it to set some specific state from outside as well.
   * @param {LoginResult} loginResult The login result to be set
   */
  public setLoginResult(loginResult: LoginResult): void {
    this.tokenStore.setLoginResult(loginResult);
    this.loginResult$.next(loginResult);

    const userInfo = this.getUserInfo();
    this.logger.info('Login was successful, user is logged in', userInfo);
    if (loginResult.redirectPath) {
      this.router.navigateByUrl(loginResult.redirectPath);
    }
  }

  /**
   * Logout the current user
   * @param {LogoutAction}  logoutAction Action to be performed after a logout.
   * If non given, default will be used.
   */
  public async logout(logoutAction?: LogoutAction): Promise<void> {
    await this.initialSetupFinished$;
    const input = this.createLogoutActionInput();
    if (this.isLoggedIn()) {
      const userInfo = this.getUserInfo();
      this.logger.info('Log out user', userInfo);
      const loginResult = { isLoggedIn: false };
      this.tokenStore.setLoginResult(loginResult);
      this.loginResult$.next(loginResult);
    }
    logoutAction = logoutAction ?? this.config.logoutAction;
    return logoutAction(input);
  }

  private createLogoutActionInput(): LogoutActionInput {
    const oldResult = this.tokenStore.getLoginResult();
    return {
      loggerFactory: this.config.loggerFactory,
      router: this.router,
      oldResult: oldResult,
      singleLogout: (redirect) => this.oidcLogout.logout(oldResult.idToken, redirect)
    };
  }

  /**
   * Get the access token of the currently logged in user
   * @returns {string | undefined} The access token or {@link undefined} if no user is
   *     logged in or he has no access token
   */
  public getAccessToken(): string | undefined {
    return this.tokenStore.getLoginResult().accessToken;
  }

  /**
   * Get the id token of the currently logged in user
   * @returns {string | undefined} The id token of {@link undefined} if no user is
   * logged in / he has no id token
   */
  public getIdToken(): string | undefined {
    return this.tokenStore.getLoginResult().idToken;
  }

  /**
   * Is a user currently logged in?
   * @returns {boolean} True if a user is logged in false otherwise
   */
  public isLoggedIn(): boolean {
    return this.tokenStore.getLoginResult().isLoggedIn;
  }

  /**
   * Get the user information of the currently logged in user
   * @returns { UserInfo | undefined} the parsed id token or undefined if no user
   * is logged in / he has no id token
   */
  public getUserInfo(): UserInfo | undefined {
    return this.tokenStore.getLoginResult().userInfo;
  }

  /**
   * When does the current token expire
   * @returns { Date | undefined} Timestamp when the current session expires
   */
  public getExpiresAt(): Date | undefined {
    return this.tokenStore.getLoginResult().expiresAt;
  }

  /**
   * Get the current login result with all fields
   * @returns { LoginResult } Current Login result
   */
  public getLoginResult(): LoginResult {
    return this.tokenStore.getLoginResult();
  }
}
