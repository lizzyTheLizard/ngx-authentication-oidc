import { UrlTree } from "@angular/router";
import { JWK } from "jose";

export type DiscoveryUrl = string;

export interface ProviderConfig {
  issuer: any;
  alg?: string[];
  maxAge?: number;
  tokenEndpoint: string;
  authEndpoint: string;
  publicKeys: JWK[]
}

export interface ClientConfig {
  clientId: string,
  redirectUri: string
}

export interface OauthConfig {
  client: ClientConfig;
  provider: DiscoveryUrl | ProviderConfig;
  logoutUrl?: string | UrlTree,
  errorUrl?:string | UrlTree,
  silentLoginEnabled?: boolean;
  silentLoginTimeoutInSecond?: number;
  silentRefreshRedirectUri?: string;
}
