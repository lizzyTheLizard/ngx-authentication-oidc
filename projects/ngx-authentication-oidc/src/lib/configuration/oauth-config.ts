import { InterruptSource } from '@ng-idle/core';
import { JWK } from 'jose';
import { LoginResult } from '../helper/login-result';
import { LoginOptions } from './login-options';
// eslint-disable-next-line prettier/prettier, @typescript-eslint/no-unused-vars
import { enforceLogin, loginResponseCheck, silentCheckAndThenEnforce, silentLoginCheck } from '../helper/initializer';
// eslint-disable-next-line prettier/prettier, @typescript-eslint/no-unused-vars
import { consoleLoggerFactory } from '../helper/console-logger';

// TODO: Document public API

export interface OauthConfig {
  /** OIDC Client Configuration */
  client: ClientConfig;
  /**
   * OIDC Provider Configuration
   * Can either be given as URL, then OIDC discovery is used or as {@link ProviderConfig}
   */
  provider: IssuerUrl | ProviderConfig;
  /**
   * Action to be performed after a logout. Can be an URL, then a redirect
   * to this URL is made, can be a function, then this function is called
   * or nothing, then nothing will be done.
   */
  logoutAction?: RedirectUrl | (() => {});
  /**
   * Action to be performed after an initialization error. Can be an URL, then a redirect
   * to this URL is made, can be a function, then this function is called
   * or nothing, then nothing will be done.
   */
  initializationErrorAction?: RedirectUrl | ((e: any) => {});
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
  tokenStore?: TokenStore;
  /** Silent login configuration, check {@link @SilentLoginConfig}. */
  silentLogin?: Partial<SilentLoginConfig>;
  /** Inactive configuration, check {@link InactiveTimeoutConfig} */
  inactiveTimeout?: Partial<InactiveTimeoutConfig>;
  /** Auto update configuration, check {@link TokenUpdateConfig} */
  autoUpdate?: Partial<TokenUpdateConfig>;
  /** Session management configuration, check {@link SessionManagementConfig} */
  sessionManagement?: Partial<SessionManagementConfig>;
}

export interface ClientConfig {
  clientId: string;
  redirectUri: string;
}

export type IssuerUrl = string;

export type RedirectUrl = string;

export interface ProviderConfig {
  issuer: any;
  alg?: string[];
  maxAge?: number;
  tokenEndpoint: string;
  authEndpoint: string;
  publicKeys: JWK[];
  checkSessionIframe?: string;
}

export interface InitializerInput {
  initialLoginResult: LoginResult;
  loggerFactory: LoggerFactory;
  login(loginOptions: LoginOptions): Promise<LoginResult>;
  silentLogin(loginOptions: LoginOptions): Promise<LoginResult>;
  handleResponse(): Promise<LoginResult>;
}
export type Initializer = (input: InitializerInput) => Promise<LoginResult>;

export interface Logger {
  debug(message: string, ...optionalParams: any[]): void;
  info(message: string, ...optionalParams: any[]): void;
  error(message: string, e?: Error | unknown, ...optionalParams: any[]): void;
}
export type LoggerFactory = (name: string) => Logger;
export interface TokenStore {
  setItem(name: string, obj: string): void;
  getItem(name: string): string | null;
  removeItem(name: string): void;
}

export interface SilentLoginConfig {
  enabled: boolean;
  timeoutInSecond: number;
  redirectUri?: string;
}

export interface InactiveTimeoutConfig {
  enabled: boolean;
  idleTimeSeconds: number;
  timeoutSeconds: number;
  interrupts: Array<InterruptSource>;
}

export interface TokenUpdateConfig {
  enabled: boolean;
  updateIntervalSeconds: number;
  minimalValiditySeconds: number;
}

export interface SessionManagementConfig {
  enabled: boolean;
  checkIntervalSeconds: number;
}
