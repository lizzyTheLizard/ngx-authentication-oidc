import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { JWK } from 'jose';
import { firstValueFrom } from 'rxjs';
import { AuthConfigService } from '../auth-config.service';
import { Logger } from '../configuration/oauth-config';

interface Metadata {
  issuer: string;
  token_endpoint: string;
  authorization_endpoint: string;
  jwks_uri?: string;
  userinfo_endpoint?: string;
  check_session_iframe?: string;
  end_session_endpoint?: string;
  id_token_signing_alg_values_supported: string[];
}

interface Jwks {
  keys: JWK[];
}

const WELL_KNOWN_POSTFIX = '/.well-known/openid-configuration';

@Injectable()
export class OidcDiscovery {
  private readonly logger: Logger;

  constructor(
    private readonly httpClient: HttpClient,
    private readonly config: AuthConfigService
  ) {
    this.logger = this.config.loggerFactory('OidcDiscovery');
  }

  public async discover(): Promise<void> {
    if (!this.config.discoveryUrl) {
      return;
    }
    const url = this.getWellKnownUrl(this.config.discoveryUrl);
    const metadata = await this.getMetadata(url);
    const jwks = await this.getJwks(metadata.jwks_uri);
    const providerConfig = {
      issuer: metadata.issuer,
      tokenEndpoint: metadata.token_endpoint,
      authEndpoint: metadata.authorization_endpoint,
      alg: metadata.id_token_signing_alg_values_supported,
      publicKeys: jwks ? jwks.keys : [],
      checkSessionIframe: metadata.check_session_iframe,
      endSessionEndpoint: metadata.end_session_endpoint
    };
    this.config.setProviderConfiguration(providerConfig);
  }

  private getWellKnownUrl(issuer: string) {
    const issuesWithoutTrailingSlash = issuer.endsWith('/')
      ? issuer.slice(0, -1)
      : issuer;
    return issuesWithoutTrailingSlash + WELL_KNOWN_POSTFIX;
  }

  private async getMetadata(url: string): Promise<Metadata> {
    const metadata = await firstValueFrom(this.httpClient.get<Metadata>(url));
    if (!metadata) {
      throw new Error('Returned metadata from ' + url + ' is empty');
    }
    if (!Object.prototype.hasOwnProperty.call(metadata, 'issuer')) {
      throw new Error(
        'Returned metadata from ' + url + ' does not contain issuer'
      );
    }
    if (!Object.prototype.hasOwnProperty.call(metadata, 'token_endpoint')) {
      throw new Error(
        'Returned metadata from ' + url + ' does not contain token_endpoint'
      );
    }
    if (
      !Object.prototype.hasOwnProperty.call(metadata, 'authorization_endpoint')
    ) {
      throw new Error(
        'Returned metadata from ' +
          url +
          ' does not contain authorization_endpoint'
      );
    }
    return metadata;
  }

  private async getJwks(url: string | undefined): Promise<Jwks | undefined> {
    if (!url) {
      return undefined;
    }
    const jwks = await firstValueFrom(this.httpClient.get<Jwks>(url));
    if (!jwks) {
      throw new Error('Returned jwks from ' + url + ' is empty');
    }
    if (!Object.prototype.hasOwnProperty.call(jwks, 'keys')) {
      throw new Error('Returned jwks from ' + url + ' does not contain keys');
    }
    return jwks;
  }
}
