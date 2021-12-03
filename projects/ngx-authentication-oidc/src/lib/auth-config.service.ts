import { UrlTree } from '@angular/router';
import { ClientConfig } from './configuration/client-config';
import { OauthConfig } from './configuration/oauth-config';
import { ProviderConfig } from './configuration/provider-config';
import { silentLoginCheck } from './initializer/default-initializer';
import { Initializer } from './initializer/initializer';
import { consoleLoggerFactory, LoggerFactory } from './logger/logger';
import { DefaultSessionHandler } from './session-handler/default-session-handler';
import { SessionHandler } from './session-handler/session-handler';
import { TokenStoreWrapper } from './token-store/token-store-wrapper';

export class AuthConfigService {
  public readonly logoutUrl?: string | UrlTree;
  public readonly errorUrl:string | UrlTree;
  public readonly tokenStore: TokenStoreWrapper;
  public readonly sessionHandler: SessionHandler;
  public readonly loggerFactory: LoggerFactory;
  public readonly initializer: Initializer;
  public readonly isSilentLoginEnabled: boolean;
  public readonly client: ClientConfig;
  public readonly provider: string | ProviderConfig;

  constructor(config: OauthConfig) {
    this.loggerFactory = config.loggerFactory ?? consoleLoggerFactory;
    this.sessionHandler = config.sessionHandler ?? new DefaultSessionHandler;
    this.tokenStore = new TokenStoreWrapper(config.tokenStore ?? localStorage);
    this.logoutUrl = config.logoutUrl;
    this.errorUrl = config.errorUrl ?? 'auth-error'
    this.initializer = config.initializer ?? silentLoginCheck;
    this.isSilentLoginEnabled = config.isSilentLoginEnabled ?? true;
    this.client = config.client;
    this.provider = config.provider;
  }
}
