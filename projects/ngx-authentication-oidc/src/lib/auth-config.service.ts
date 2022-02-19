/* global localStorage */
// eslint-disable-next-line prettier/prettier
import { TokenUpdateConfig as AutoUpdateConfig, ClientConfig, InactiveTimeoutConfig, Initializer, IssuerUrl, LoggerFactory, OauthConfig, ProviderConfig, SessionManagementConfig, SilentLoginConfig, TokenStore } from './configuration/oauth-config';
import { DEFAULT_INTERRUPTSOURCES } from '@ng-idle/core';
// eslint-disable-next-line prettier/prettier
import { consoleLoggerFactory } from './helper/console-logger';
import { loginResponseCheck, silentLoginCheck } from './helper/initializer';

export class AuthConfigService {
  public readonly client: ClientConfig;
  public readonly discoveryUrl?: IssuerUrl;
  public readonly logoutAction?: string | (() => {});
  public readonly initializationErrorAction?: string | ((e: any) => {});
  public readonly loggerFactory: LoggerFactory;
  public readonly tokenStore: TokenStore;
  public readonly silentLogin: SilentLoginConfig;
  public readonly inactiveTimeout: InactiveTimeoutConfig;
  public readonly autoUpdate: AutoUpdateConfig;
  public readonly sessionManagement: SessionManagementConfig;
  private providerConfiguration?: ProviderConfig;
  public readonly initializer: Initializer;

  constructor(config: OauthConfig) {
    this.client = config.client;
    this.discoveryUrl = this.createDiscoveryUrl(config);
    this.logoutAction = config.logoutAction;
    this.initializationErrorAction = config.initializationErrorAction;
    this.loggerFactory = config.loggerFactory ?? consoleLoggerFactory;
    this.tokenStore = config.tokenStore ?? localStorage;
    this.silentLogin = this.createSilentLogin(config);
    this.inactiveTimeout = this.createInactive(config);
    this.autoUpdate = this.createAutoUpdate(config);
    this.initializer = this.createInitializer(config);
    this.sessionManagement = this.createSessionMgm(config);
  }

  private createDiscoveryUrl(config: OauthConfig): IssuerUrl | undefined {
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
      timeoutInSecond: input?.timeoutInSecond ?? 5,
      redirectUri: input?.redirectUri
    };
  }

  private createInactive(config: OauthConfig): InactiveTimeoutConfig {
    const input = config.inactiveTimeout;
    return {
      idleTimeSeconds: input?.idleTimeSeconds ?? 300,
      timeoutSeconds: input?.timeoutSeconds ?? 60,
      interrupts: input?.interrupts ?? DEFAULT_INTERRUPTSOURCES,
      enabled: input?.enabled ?? true
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
    return (
      config.initializer ??
      (this.silentLogin.enabled ? silentLoginCheck : loginResponseCheck)
    );
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
