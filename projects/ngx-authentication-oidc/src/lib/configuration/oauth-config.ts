import { UrlTree } from '@angular/router';
import { InterruptSource } from '@ng-idle/core';
import { JWK } from 'jose';
import { LoginResult } from '../helper/login-result';
import { LoginOptions } from './login-options';

// TODO: Document public API

export interface OauthConfig {
  client: ClientConfig;
  provider: DiscoveryUrl | ProviderConfig;
  logoutUrl?: string | UrlTree;
  errorUrl?: string | UrlTree;
  initializer?: Initializer;
  loggerFactory?: LoggerFactory;
  tokenStore?: TokenStore;
  silentLogin?: Partial<SilentLoginConfig>;
  inactiveTimeout?: Partial<InactiveTimeoutConfig>;
  autoUpdate?: Partial<TokenUpdateConfig>;
}

export interface ClientConfig {
  clientId: string;
  redirectUri: string;
}

export type DiscoveryUrl = string;

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
