import { UrlTree } from '@angular/router';
import { OauthConfig, ProviderConfig, ClientConfig } from './configuration/oauth-config';

export class AuthConfigService {
  public readonly logoutUrl?: string | UrlTree;
  public readonly errorUrl:string | UrlTree;
  public readonly silentLoginEnabled: boolean;
  public readonly silentLoginTimeoutInSecond: number;
  public readonly client: ClientConfig;
  public readonly provider: string | ProviderConfig;
  public readonly silentRefreshRedirectUri: string | undefined;
  private providerConfiguration?: ProviderConfig;

  constructor(config: OauthConfig) {
    this.logoutUrl = config.logoutUrl;
    this.errorUrl = config.errorUrl ?? 'auth-error'
    this.silentLoginEnabled = config.silentLoginEnabled ?? true;
    this.silentLoginTimeoutInSecond = config.silentLoginTimeoutInSecond ?? 5;
    this.silentRefreshRedirectUri = config.silentRefreshRedirectUri;
    this.client = config.client;
    this.provider = config.provider;
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
