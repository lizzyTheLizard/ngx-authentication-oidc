import { Inject, Injectable } from '@angular/core';
import {
  JWTHeaderParameters,
  JWTPayload,
  KeyLike,
  importJWK,
  jwtVerify
} from 'jose';
import { AuthConfigService } from '../auth-config.service';
import { Logger, LoggerFactory, LoggerFactoryToken } from '../logger/logger';
import { UserInfo } from '../login-result';

@Injectable()
export class OidcTokenValidator {
  private readonly logger: Logger;

  constructor(
    private readonly config: AuthConfigService,
    @Inject(LoggerFactoryToken) loggerFactory: LoggerFactory
  ) {
    this.logger = loggerFactory('OidcTokenValidator');
  }

  public async verify(idToken?: string, nonce?: string): Promise<UserInfo> {
    if (!idToken) {
      throw new Error('No id token given');
    }

    const verifyResult = await jwtVerify(
      idToken,
      (header) => this.getKey(header),
      {}
    );
    const claims = verifyResult.payload;
    const headers = verifyResult.protectedHeader;

    if (!claims) {
      throw new Error('No claims given');
    }
    if (!headers) {
      throw new Error('No headers given');
    }
    this.validateAccessTokenHash();
    this.validateIssuer(claims);
    this.validateAudience(claims);
    this.validateAlgorithm(headers);
    this.validateTime(claims);
    this.validateNonce(claims, nonce);

    if (!claims.sub) {
      throw new Error('No sub given');
    }

    return {
      ...claims,
      sub: claims.sub!
    };
  }

  private async getKey(
    header: JWTHeaderParameters
  ): Promise<KeyLike | Uint8Array> {
    const publicKeys = this.config.getProviderConfiguration().publicKeys;
    const sigKeys = publicKeys
      .filter((k) => !header.alg || !k.alg || k.alg === header.alg)
      .filter((k) => !k.use || k.use == 'sig');
    if (sigKeys.length === 0) {
      this.logger.error('No signature keys given');
      throw new Error('No valid signature key found');
    }
    if (!header.kid && sigKeys.length == 1) {
      return importJWK(sigKeys[0]);
    }
    if (!header.kid) {
      this.logger.error(
        'Multiple signature keys but no kid keys given, take first'
      );
      return importJWK(sigKeys[0]);
    }
    const keys = sigKeys.filter((k) => k.kid === header.kid);
    if (keys.length == 0) {
      this.logger.error(
        'No key with kid ' + header.kid + ' could be found in the key set'
      );
      throw new Error('No valid key found');
    }
    return importJWK(keys[0]);
  }

  private validateAccessTokenHash() {
    //TODO: Validate at_hash according to 3.2.2.9
    /*
    Hash the octets of the ASCII representation of the access_token with the hash algorithm specified in JWA [JWA] for the alg Header Parameter of the ID Token's JOSE Header. For instance, if the alg is RS256, the hash algorithm used is SHA-256.
    Take the left-most half of the hash and base64url encode it.
    The value of at_hash in the ID Token MUST match the value produced in the previous step.
    */
  }

  private validateIssuer(claims: JWTPayload) {
    if (!claims.iss) {
      throw new Error('ID-Token contains invalid iss claim');
    }
    const issuer = this.config.getProviderConfiguration().issuer;
    if (claims.iss !== issuer) {
      throw new Error('ID-Token contains invalid iss claim');
    }
  }

  private validateAudience(claims: JWTPayload) {
    if (!claims.aud) {
      throw new Error('ID-Token does not contain valid aud claim');
    }

    if (typeof claims.aud === 'string') {
      if (claims.aud !== this.config.client.clientId) {
        throw new Error('ID-Token does not contain valid aud claim');
      }
    } else if (Array.isArray(claims.aud)) {
      if (!(claims.aud as string[]).includes(this.config.client.clientId)) {
        throw new Error('ID-Token does not contain correct aud claim');
      }
    } else {
      throw new Error('ID-Token does not contain valid aud claim');
    }
  }

  private validateAlgorithm(headers: JWTHeaderParameters) {
    const alg = this.config.getProviderConfiguration().alg;
    if (!alg && headers.alg !== 'RS256') {
      throw Error('Wrong ID-Token algorithm');
    }
    if (!headers.alg) {
      throw Error('No algorithm defined');
    }
    if (alg && !alg.includes(headers.alg)) {
      throw Error('Wrong ID-Token algorithm');
    }
    if (!alg && headers.alg !== 'RS256') {
      throw Error('Wrong ID-Token algorithm');
    }
    return;
  }

  private validateTime(claims: JWTPayload) {
    const actualTime = Math.floor(Date.now() / 1000);
    if (!claims.exp) {
      throw new Error('exp claim required');
    }
    if (claims.exp <= actualTime) {
      throw new Error(
        'exp claim is ' +
          claims.exp +
          ' which is in the past. Current time is ' +
          actualTime
      );
    }
    if (!claims.iat) {
      throw new Error('iat claim required');
    }
    if (claims.iat > actualTime) {
      throw new Error(
        'iat claim is ' +
          claims.iat +
          ' which is in the future. Current time is ' +
          actualTime
      );
    }
    const maxAge = this.config.getProviderConfiguration().maxAge;
    if (maxAge && claims.iat < actualTime - maxAge) {
      throw new Error(
        'iat claim is ' +
          claims.iat +
          ' which is too old. Current time is ' +
          actualTime +
          ' and max age is ' +
          maxAge
      );
    }
    if (claims.nbf && claims.nbf >= actualTime) {
      throw new Error(
        'nbf claim is ' +
          claims.nbf +
          ' which is in the future. Current time is ' +
          actualTime
      );
    }
    return;
  }

  private validateNonce(claims: JWTPayload, nonce?: string) {
    if (nonce && nonce !== claims['nonce']) {
      throw new Error('Nonce not returned');
    }
  }
}
