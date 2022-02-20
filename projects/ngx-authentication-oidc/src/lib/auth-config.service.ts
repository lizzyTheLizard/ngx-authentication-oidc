/* global localStorage */
// eslint-disable-next-line prettier/prettier
import { AutoUpdateConfig, ErrorAction, InactiveTimeoutConfig, Initializer, LoggerFactory, LogoutAction, OauthConfig, ProviderConfig, SessionManagementConfig, SilentLoginConfig, UserInfoSource } from './configuration/oauth-config';
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
  private providerConfiguration?: ProviderConfig;

  constructor(config: OauthConfig) {
    this.clientId = config.clientId;
    this.redirectUri = config.redirectUri;
    this.discoveryUrl = this.createDiscoveryUrl(config);
    this.logoutAction = config.logoutAction ?? singleLogoutOrRedirect('/auth/logout');
    this.initializationErrorAction = config.initializationErrorAction ?? redirect('/auth/error');
    this.loggerFactory = config.loggerFactory ?? consoleLoggerFactory;
    this.tokenStore = config.tokenStore ?? localStorage;
    this.silentLogin = this.createSilentLogin(config);
    this.inactiveTimeout = this.createInactive(config);
    this.autoUpdate = this.createAutoUpdate(config);
    this.initializer = this.createInitializer(config);
    this.sessionManagement = this.createSessionMgm(config);
    this.userInfoSource = config.userInfoSource ?? UserInfoSource.TOKEN_THEN_USER_INFO_ENDPOINT;
  }

  private createDiscoveryUrl(config: OauthConfig): string | undefined {
    if (typeof config.provider === 'string') {
      return config.provider;
    } else {
      this.providerConfiguration = config.provider;
      return undefined;
    }
  }

  private createSilentLogin(config: OauthConfig): SilentLoginConfig {
    const input = config.silentLogin;
    return {
      enabled: input?.enabled ?? true,
      timeoutInSecond: input?.timeoutInSecond ?? 2,
      redirectUri: input?.redirectUri
    };
  }

  private createInactive(config: OauthConfig): InactiveTimeoutConfig {
    const input = config.inactiveTimeout;
    return {
      idleTimeSeconds: input?.idleTimeSeconds ?? 300,
      timeoutSeconds: input?.timeoutSeconds ?? 60,
      interrupts: input?.interrupts ?? DEFAULT_INTERRUPTSOURCES,
      enabled: input?.enabled ?? true,
      timeoutAction: input?.timeoutAction ?? redirect('/auth/logout')
    };
  }

  private createSessionMgm(config: OauthConfig): SessionManagementConfig {
    const input = config.sessionManagement;
    return {
      enabled: input?.enabled ?? true,
      checkIntervalSeconds: input?.checkIntervalSeconds ?? 10
    };
  }

  private createAutoUpdate(config: OauthConfig): AutoUpdateConfig {
    const input = config.autoUpdate;
    return {
      enabled: input?.enabled ?? true,
      updateIntervalSeconds: input?.updateIntervalSeconds ?? 60,
      minimalValiditySeconds: input?.minimalValiditySeconds ?? 90
    };
  }

  private createInitializer(config: OauthConfig): Initializer {
    return config.initializer ?? (this.silentLogin.enabled ? silentLoginCheck : loginResponseCheck);
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
