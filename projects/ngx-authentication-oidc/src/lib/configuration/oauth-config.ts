import { InterruptSource } from '@ng-idle/core';
import { JWK } from 'jose';
import { LoginResult } from '../helper/login-result';
import { LoginOptions } from './login-options';
// eslint-disable-next-line prettier/prettier, @typescript-eslint/no-unused-vars
import { enforceLogin, loginResponseCheck, silentCheckAndThenEnforce, silentLoginCheck } from '../helper/initializer';
// eslint-disable-next-line prettier/prettier, @typescript-eslint/no-unused-vars
import { consoleLoggerFactory } from '../helper/console-logger';

/** General configuration object, needed to initialize {@link AuthenticationModule} */
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
   * Action to be performed after a logout. Can be an URL, then a redirect
   * to this URL is made, can be a function, then this function is called
   * or nothing, then nothing will be done.
   */
  logoutAction?: string | (() => void);
  /**
   * Action to be performed after an initialization error. Can be an URL, then a redirect
   * to this URL is made, can be a function, then this function is called
   * or nothing, then nothing will be done.
   */
  initializationErrorAction?: string | ((e: any) => void);
  /**
   * Function to initialize the library. Either use a default like {@link silentLoginCheck},
   * {@link enforceLogin}, {@link silentCheckAndThenEnforce}, {@link loginResponseCheck} or
   * define your own function. When not set {@link silentLoginCheck} is used when silent login
   * is enabled and {@link loginResponseCheck} otherwise
   */
  initializer?: Initializer;
  /** Factory to generate loggers. When not set {@link consoleLoggerFactory} is used. */
  loggerFactory?: LoggerFactory;
  /**
   * Place to store tokens. Default is {@link localStorage}, but you could also use
   * {@link sessionStorage} or your own implementation.
   */
  tokenStore?: Storage;
  /** Silent login configuration, check {@link @SilentLoginConfig}. */
  silentLogin?: Partial<SilentLoginConfig>;
  /** Inactive configuration, check {@link InactiveTimeoutConfig} */
  inactiveTimeout?: Partial<InactiveTimeoutConfig>;
  /** Auto update configuration, check {@link TokenUpdateConfig} */
  autoUpdate?: Partial<TokenUpdateConfig>;
  /** Session management configuration, check {@link SessionManagementConfig} */
  sessionManagement?: Partial<SessionManagementConfig>;
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
  /** Max age of the ID-Token in seconds. Token older than this will be rejected */
  maxAge?: number;
  /** URL of the token endpoint */
  tokenEndpoint: string;
  /** URL of the auth endpoint */
  authEndpoint: string;
  /** Public keys used to sign the ID-Token. If none given, do not verify signature */
  publicKeys?: JWK[];
  /** URL of the check session iframe. If not given, no session management will be used */
  checkSessionIframe?: string;
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
  /** Timeout for silent login, default is 5 seconds */
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
  /** Number of seconds of inactivity until a user is assumed to be inactive */
  idleTimeSeconds: number;
  /** Number of seconds until a user is logged out when he is inactive */
  timeoutSeconds: number;
  /** The interrupts regarded as "user activity" */
  interrupts: Array<InterruptSource>;
}

/** Token update configuration */
export interface TokenUpdateConfig {
  /**
   * Enables automatic token update, default is true.
   * If enabled, tokens will be updated automatically
   */
  enabled: boolean;
  /** Update interval in seconds */
  updateIntervalSeconds: number;
  /**
   * Minimal validity of token in seconds.
   * If the remaining token validity is small that this, the token will be updated
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
  /** Update interval in seconds */
  checkIntervalSeconds: number;
}
