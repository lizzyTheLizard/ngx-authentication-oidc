import { UrlTree } from '@angular/router';
import { IdleConfiguration } from './configuration/idle-configuration';
import { OauthConfig, ProviderConfig, ClientConfig } from './configuration/oauth-config';
import { DEFAULT_INTERRUPTSOURCES } from '@ng-idle/core';

export class AuthConfigService {
  public readonly logoutUrl?: string | UrlTree;
  public readonly errorUrl:string | UrlTree;
  public readonly silentLoginEnabled: boolean;
  public readonly inactiveSessionHandlingEnabled: boolean;
  public readonly silentLoginTimeoutInSecond: number;
  public readonly client: ClientConfig;
  public readonly provider: string | ProviderConfig;
  public readonly silentRefreshRedirectUri: string | undefined;
  public readonly idleConfiguration: IdleConfiguration;
  public readonly tokenUpdateIntervalSeconds: number;
  public readonly minimalTokenValiditySeconds: number;
  private providerConfiguration?: ProviderConfig;

  constructor(config: OauthConfig) {
    this.logoutUrl = config.logoutUrl;
    this.errorUrl = config.errorUrl ?? 'auth-error'
    this.silentLoginEnabled = config.silentLoginEnabled ?? true;
    this.inactiveSessionHandlingEnabled = config.inactiveSessionHandlingEnabled ?? true;
    this.silentLoginTimeoutInSecond = config.silentLoginTimeoutInSecond ?? 5;
    this.silentRefreshRedirectUri = config.silentRefreshRedirectUri;
    this.client = config.client;
    this.provider = config.provider;
    this.tokenUpdateIntervalSeconds = config.tokenUpdateIntervalSeconds ?? 30;
    this.minimalTokenValiditySeconds = config.minimalTokenValiditySeconds ?? 60;
    this.idleConfiguration = this.createIdleConfiguration(config.idleConfiguration)
  }

  private createIdleConfiguration(idleConfiguration?: Partial<IdleConfiguration>): IdleConfiguration {
    return {
      idleTimeSeconds: idleConfiguration?.idleTimeSeconds ?? 60,
      timeoutSeconds: idleConfiguration?.timeoutSeconds ?? 60,
      interruptsSource: idleConfiguration?.interruptsSource ?? DEFAULT_INTERRUPTSOURCES,
    };
  }

  public setProviderConfiguration(providerConfiguration: ProviderConfig){
    this.providerConfiguration = providerConfiguration;
  }

  public getProviderConfiguration(): ProviderConfig {
    if(!this.providerConfiguration) {
      throw new Error("Provider Configuration not initialized");
    }
    return this.providerConfiguration;
  }
}
