import { InterruptSource } from '@ng-idle/core';
import { JWK } from 'jose';
import { LoginResult } from '../login-result';
import { LoginOptions } from './login-options';
import { Router } from '@angular/router';

/**
 * General configuration object, needed to initialize {@link AuthenticationModule}
 */
export interface OauthConfig {
  /** OIDC Client ID */
  clientId: string;
  /** OIDC Redirect URI. If not given, base URL of the application is used */
  redirectUri?: string;
  /**
   * OIDC Provider Configuration
   * Can either be given as URL, then OIDC discovery is used or as {@link ProviderConfig}
   */
  provider: string | ProviderConfig;
  /**
   * Where to get the user information from, see {@link UserInfoSource}.
   * If not given {@link UserInfoSource.USER_INFO_ENDPOINT} is used
   */
  userInfoSource?: UserInfoSource;
  /**
   * Action to be performed after a logout.
   * See {@link ./default-actions.d.ts} for options or define your own function.
   * When not set, a single logout is used when single logout
   * is possible and a redirect to '/auth/logout' otherwise
   */
  logoutAction?: LogoutAction;
  /**
   * Action to be performed after an initialization error.
   * See {@link ./default-actions.d.ts} for options or define your own function.
   * When not set a redirect to '/auth/logout' is used
   */
  initializationErrorAction?: ErrorAction;
  /**
   * URL to redirect if the use is not allowed to see a route,
   * used by the provided guards
   * When not set '/auth/forbidden' is used
   */
  notAllowedUri?: string;
  /**
   * Function to initialize the library.
   * See {@link ./initializer.d.ts} for options or define your own function.
   * When not set, single login with iframe is used when silent login
   * is enabled and the normal response check otherwise.
   */
  // TODO: Better default between silentRedirectLoginCheck and silentIframeLoginCheck
  initializer?: Initializer;
  /** Factory to generate loggers. When not set the console is used. */
  loggerFactory?: LoggerFactory;
  /**
   * Place to store tokens. Default is {@link sessionStorage}, but you could also use
   * {@link localStorage} or your own implementation.
   */
  tokenStore?: Storage;
  /** Silent login configuration, check {@link @SilentLoginConfig}. */
  silentLogin?: Partial<SilentLoginConfig>;
  /** Inactive configuration, check {@link InactiveTimeoutConfig} */
  inactiveTimeout?: Partial<InactiveTimeoutConfig>;
  /** Auto update configuration, check {@link AutoUpdateConfig} */
  autoUpdate?: Partial<AutoUpdateConfig>;
  /** Session management configuration, check {@link SessionManagementConfig} */
  sessionManagement?: Partial<SessionManagementConfig>;
  tokenTolerances?: Partial<TokenTolerancesConfig>;
  /**
   * URL-Prefixes to whom the access token shall be send as authentication header.
   * To avoid sending the token to wrong hosts, use only at least FQDNs here,
   * like "https://test.example.com/path/". The prefix has to match the beginning of the URL
   * exactly, no pattern matching or similar allowed.
   * If multiple prefixes are defined, the token is send if ONE matches the URL
   */
  accessTokenUrlPrefixes?: string | string[];
}

/**
 * Configuration of the OIDC provider. Usually, this you should not define this manually,
 * instead use OIDC discovery.
 */
export interface ProviderConfig {
  /** Token issuer as will be used in the ID-Tokens */
  issuer: string;
  /** Algorithm to be used in the ID-Tokens. If not given, all algorithms will be accepted */
  alg?: string[];
  /**
   * Max age of the ID-Token in seconds. Token older than this will be rejected.
   * If not given, no max age is enforced
   */
  maxAge?: number;
  /** URL of the token endpoint */
  tokenEndpoint: string;
  /** URL of the auth endpoint */
  authEndpoint: string;
  /** Public keys used to sign the ID-Token. If none given, do not verify signature */
  publicKeys?: JWK[];
  /** URL of the check session iframe. If not given, no session management will be used */
  checkSessionIframe?: string;
  /** URL of the end session endpoint. If not given, no single logout be used */
  endSessionEndpoint?: string;
  /** URL of the user info session endpoint. If not given, no user info call is made*/
  userInfoEndpoint?: string;
}

/** Input to the {@link Initializer} function */
export interface InitializerInput {
  /** Login-Result as read from token store before initialization */
  initialLoginResult: LoginResult;
  /** Logger factory to generate a logger from */
  loggerFactory: LoggerFactory;
  /** Function to perform a login */
  login(loginOptions: LoginOptions): Promise<LoginResult>;
  /** Function to perform a silent login */
  silentLogin(loginOptions: LoginOptions): Promise<LoginResult>;
  /** Function to handle an OIDC-Response */
  handleResponse(): Promise<LoginResult>;
  /** Check if this is an failed OIDC response */
  isErrorResponse(): boolean;
}
export type Initializer = (input: InitializerInput) => Promise<LoginResult>;

/**
 * Interface for a logger, similar to e.g. {@link console}
 * allowing you to use another logger if desired
 */
export interface Logger {
  debug(message: string, ...optionalParams: any[]): void;
  info(message: string, ...optionalParams: any[]): void;
  error(message: string, e?: Error | unknown, ...optionalParams: any[]): void;
}
export type LoggerFactory = (name: string) => Logger;

/** Configuration for silent login */
export interface SilentLoginConfig {
  /** Is silent login enabled, default is true */
  enabled: boolean;
  /** Timeout for silent login, default is 2 seconds */
  timeoutInSecond: number;
  /**
   * Redirect URL to use for silent login,
   * default is 'assets/silent-refresh.html' which points to a given asset
   */
  redirectUri?: string;
}

/** Inactive timeout configuration */
export interface InactiveTimeoutConfig {
  /**
   * Enables inactive timeout, default is true.
   * If enabled, a session will be terminated when the user is inactive
   */
  enabled: boolean;
  /** Number of seconds of inactivity until a user is assumed to be inactive. Default is 300 */
  idleTimeSeconds: number;
  /** Number of seconds until a user is logged out when he is inactive. Default is 60 */
  timeoutSeconds: number;
  /** The interrupts regarded as "user activity" */
  interrupts: Array<InterruptSource>;
  /**
   * Action to be performed after a logout due to a timeout.
   * See {@link ./default-actions.d.ts} for options or define your own function.
   * When not set a redirect to '/auth/logout' is used
   */
  timeoutAction: LogoutAction;
}

/** Token auto update configuration */
export interface AutoUpdateConfig {
  /**
   * Enables automatic token update, default is true.
   * If enabled, tokens will be updated automatically
   */
  enabled: boolean;
  /** Update interval in seconds, default is 60*/
  updateIntervalSeconds: number;
  /**
   * Minimal validity of token in seconds.
   * If the remaining token validity is small that this, the token will be updated
   * Default is 90
   */
  minimalValiditySeconds: number;
}

/** Session Management Configuration */
export interface SessionManagementConfig {
  /**
   * Enables session management, default is true.
   * If enabled, the session at the authentication server is checked
   * regularly using OIDC session management (only if supported by authentication server)
   * If the session ends on the authentication server, the user is logged out in the application
   * as well
   */
  enabled: boolean;
  /** Update interval in seconds, default is 10 */
  checkIntervalSeconds: number;
}

export interface LogoutActionInput {
  /** Login-Result before the logout */
  oldResult: LoginResult;
  /** Logger factory to generate a logger from */
  loggerFactory: LoggerFactory;
  /**
   * Function to perform a single logout.
   * Returns true if single login has worked and false otherwise
   */
  singleLogout(redirectUri?: string): Promise<boolean>;
  /** The angular router */
  router: Router;
}
export type LogoutAction = (input: LogoutActionInput) => Promise<void>;

export interface ErrorActionInput {
  /** The error */
  error: any;
  /** Logger factory to generate a logger from */
  loggerFactory: LoggerFactory;
  /** The angular router */
  router: Router;
}
export type ErrorAction = (input: ErrorActionInput) => void;

/** Sources where to get user information from */
export enum UserInfoSource {
  /** Only use the information in the ID-Token */
  TOKEN = 'token',
  /** Only use the information from the userinfo endpoint*/
  USER_INFO_ENDPOINT = 'userinfo',
  /** Use the information in the token if given and the userinfo endpoint otherwise */
  TOKEN_THEN_USER_INFO_ENDPOINT = 'token_then_userinfo'
}

export interface TokenTolerancesConfig {
  expTolerance: number;
  iatTolerance: number;
}
