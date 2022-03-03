/* global localStorage */
// eslint-disable-next-line prettier/prettier
import { AutoUpdateConfig, ErrorAction, InactiveTimeoutConfig, Initializer, Logger, LoggerFactory, LogoutAction, OauthConfig, ProviderConfig, SessionManagementConfig, SilentLoginConfig, UserInfoSource } from './configuration/oauth-config';
import { DEFAULT_INTERRUPTSOURCES } from '@ng-idle/core';
import { consoleLoggerFactory } from './helper/console-logger';
import { loginResponseCheck, silentLoginCheck } from './helper/initializer';
// eslint-disable-next-line prettier/prettier
import { redirect, singleLogoutOrRedirect } from './helper/defaultActions';

export class AuthConfigService {
  public readonly clientId: string;
  public readonly redirectUri?: string;
  public readonly discoveryUrl?: string;
  public readonly logoutAction: LogoutAction;
  public readonly initializationErrorAction: ErrorAction;
  public readonly loggerFactory: LoggerFactory;
  public readonly tokenStore: Storage;
  public readonly silentLogin: SilentLoginConfig;
  public readonly inactiveTimeout: InactiveTimeoutConfig;
  public readonly autoUpdate: AutoUpdateConfig;
  public readonly sessionManagement: SessionManagementConfig;
  public readonly userInfoSource: UserInfoSource;
  public readonly initializer: Initializer;
  public readonly accessTokenUrlPrefixes: string[];
  private providerConfiguration?: ProviderConfig;
  private readonly logger: Logger;

  constructor(private readonly config: OauthConfig) {
    this.loggerFactory = config.loggerFactory ?? consoleLoggerFactory;
    this.logger = this.loggerFactory('AuthConfigService');
    this.clientId = config.clientId;
    this.redirectUri = config.redirectUri;
    this.discoveryUrl = this.createDiscoveryUrl();
    this.logoutAction = config.logoutAction ?? singleLogoutOrRedirect('/auth/logout');
    this.initializationErrorAction = config.initializationErrorAction ?? redirect('/auth/error');
    this.tokenStore = config.tokenStore ?? localStorage;
    this.silentLogin = this.createSilentLogin();
    this.inactiveTimeout = this.createInactive();
    this.autoUpdate = this.createAutoUpdate();
    this.initializer = this.createInitializer();
    this.sessionManagement = this.createSessionMgm();
    this.accessTokenUrlPrefixes = this.createAccessTokenUrlPrefixes();
    this.userInfoSource = config.userInfoSource ?? UserInfoSource.USER_INFO_ENDPOINT;
    this.logger.debug('Configuration set to', this);
  }

  private createDiscoveryUrl(): string | undefined {
    if (typeof this.config.provider === 'string') {
      return this.config.provider;
    } else {
      this.providerConfiguration = this.config.provider;
      return undefined;
    }
  }

  private createSilentLogin(): SilentLoginConfig {
    const input = this.config.silentLogin;
    return {
      enabled: input?.enabled ?? true,
      timeoutInSecond: input?.timeoutInSecond ?? 2,
      redirectUri: input?.redirectUri
    };
  }

  private createInactive(): InactiveTimeoutConfig {
    const input = this.config.inactiveTimeout;
    return {
      idleTimeSeconds: input?.idleTimeSeconds ?? 300,
      timeoutSeconds: input?.timeoutSeconds ?? 60,
      interrupts: input?.interrupts ?? DEFAULT_INTERRUPTSOURCES,
      enabled: input?.enabled ?? true,
      timeoutAction: input?.timeoutAction ?? redirect('/auth/logout')
    };
  }

  private createSessionMgm(): SessionManagementConfig {
    const input = this.config.sessionManagement;
    return {
      enabled: input?.enabled ?? true,
      checkIntervalSeconds: input?.checkIntervalSeconds ?? 10
    };
  }

  private createAutoUpdate(): AutoUpdateConfig {
    const input = this.config.autoUpdate;
    return {
      enabled: input?.enabled ?? true,
      updateIntervalSeconds: input?.updateIntervalSeconds ?? 60,
      minimalValiditySeconds: input?.minimalValiditySeconds ?? 90
    };
  }

  private createInitializer(): Initializer {
    const input = this.config.initializer;
    if (input) {
      return input;
    }
    return this.silentLogin.enabled ? silentLoginCheck : loginResponseCheck;
  }

  private createAccessTokenUrlPrefixes(): string[] {
    let input = this.config.accessTokenUrlPrefixes;
    if (!input) {
      return [];
    }
    if (typeof input === 'string') {
      input = [input];
    }
    input.forEach((x) => this.checkAccessTokenUrlPrefix(x));
    return input;
  }

  private checkAccessTokenUrlPrefix(prefix: string) {
    if (!prefix) {
      return;
    }
    if (prefix.length === 0) {
      this.logger.error(
        'One of the inputs to accessTokenUrlPatterns is the empty string. ' +
          'This is dangerous, as the access token is now send with all requests. ' +
          'Please use only valid domains as prefixes',
        prefix
      );
      return;
    }
    try {
      new URL(prefix);
    } catch (e) {
      this.logger.error(
        'One of the inputs to accessTokenUrlPatterns is not a valid URL. ' +
          'This is dangerous, as the access token is could be send with various requests. ' +
          'Please use only valid domains as prefixes',
        prefix
      );
    }
  }

  public setProviderConfiguration(providerConfiguration: ProviderConfig) {
    if (this.providerConfiguration) {
      throw new Error('Provider Configuration is already initialized');
    }
    this.providerConfiguration = providerConfiguration;
  }

  public getProviderConfiguration(): ProviderConfig {
    if (!this.providerConfiguration) {
      throw new Error('Provider Configuration not initialized');
    }
    return this.providerConfiguration;
  }
}
