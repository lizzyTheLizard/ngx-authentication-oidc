/* global localStorage */
import { UrlTree } from '@angular/router';
// eslint-disable-next-line prettier/prettier
import { TokenUpdateConfig as AutoUpdateConfig, ClientConfig, DiscoveryUrl, InactiveTimeoutConfig as InactiveTimeout, Initializer, LoggerFactory, OauthConfig, ProviderConfig, SilentLoginConfig, TokenStore } from './configuration/oauth-config';
import { DEFAULT_INTERRUPTSOURCES } from '@ng-idle/core';
// eslint-disable-next-line prettier/prettier
import { consoleLoggerFactory } from './helper/console-logger';
import { loginResponseCheck, silentLoginCheck } from './helper/initializer';

export class AuthConfigService {
  public readonly client: ClientConfig;
  public readonly discoveryUrl?: DiscoveryUrl;
  public readonly logoutUrl?: string | UrlTree;
  public readonly errorUrl: string | UrlTree;
  public readonly loggerFactory: LoggerFactory;
  public readonly tokenStore: TokenStore;
  public readonly silentLogin: SilentLoginConfig;
  public readonly inactiveTimeout: InactiveTimeout;
  public readonly autoUpdate: AutoUpdateConfig;
  private providerConfiguration?: ProviderConfig;
  public readonly initializer: Initializer;

  constructor(config: OauthConfig) {
    this.client = config.client;
    this.discoveryUrl = this.createDiscoveryUrl(config);
    this.logoutUrl = config.logoutUrl;
    this.errorUrl = config.errorUrl ?? 'auth-error';
    this.loggerFactory = config.loggerFactory ?? consoleLoggerFactory;
    this.tokenStore = config.tokenStore ?? localStorage;
    this.silentLogin = this.createSilentLogin(config);
    this.inactiveTimeout = this.createInactive(config);
    this.autoUpdate = this.createAutoUpdate(config);
    this.initializer = this.createInitializer(config);
  }

  private createDiscoveryUrl(config: OauthConfig): DiscoveryUrl | undefined {
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
      timeoutInSecond: input?.timeoutInSecond ?? 60,
      redirectUri: input?.redirectUri
    };
  }

  private createInactive(config: OauthConfig): InactiveTimeout {
    const input = config.inactiveTimeout;
    return {
      idleTimeSeconds: input?.idleTimeSeconds ?? 300,
      timeoutSeconds: input?.timeoutSeconds ?? 60,
      interrupts: input?.interrupts ?? DEFAULT_INTERRUPTSOURCES,
      enabled: input?.enabled ?? true
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
