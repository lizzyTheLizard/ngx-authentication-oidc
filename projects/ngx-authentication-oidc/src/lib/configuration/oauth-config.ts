import { UrlTree } from "@angular/router";
import { Initializer } from "../initializer/initializer";
import { LoggerFactory } from "../logger/logger";
import { SessionHandler } from "../session-handler/session-handler";
import { TokenStore } from "../token-store/token-store";
import { ClientConfig } from "./client-config";
import { ProviderConfig } from "./provider-config";

export type DiscoveryUrl = string;

export interface OauthConfig {
  client: ClientConfig;
  provider: DiscoveryUrl | ProviderConfig;
  logoutUrl?: string | UrlTree,
  errorUrl?:string | UrlTree,
  tokenStore?: TokenStore;
  sessionHandler?: SessionHandler;
  loggerFactory?: LoggerFactory;
  initializer?: Initializer;
  silentLoginEnabled?: boolean;
  silentLoginTimeoutInSecond?: number;
  silentRefreshRedirectUri?: string;
}
