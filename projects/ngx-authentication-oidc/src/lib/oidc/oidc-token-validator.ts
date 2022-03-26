/* global crypto */
import { Inject, Injectable } from '@angular/core';
// eslint-disable-next-line prettier/prettier
import { JWK, JWTHeaderParameters, JWTPayload, JWTVerifyResult, KeyLike, base64url, importJWK, jwtVerify } from 'jose';
import { AuthConfigService } from '../auth-config.service';
import { WindowToken } from '../authentication-module.tokens';
import { Logger } from '../configuration/oauth-config';
import { UserInfo } from '../login-result';

const hashAlgorithms = new Map<string, string>([
  ['HS256', 'SHA-256'],
  ['RS256', 'SHA-256'],
  ['PS256', 'SHA-256'],
  ['ES256', 'SHA-256'],
  ['ES256K', 'SHA-256'],
  ['HS384', 'SHA-384'],
  ['RS384', 'SHA-384'],
  ['PS384', 'SHA-384'],
  ['ES384', 'SHA-384'],
  ['HS512', 'SHA-512'],
  ['RS512', 'SHA-512'],
  ['PS512', 'SHA-512'],
  ['ES512', 'SHA-512']
]);
export interface ValidationOptions {
  implicit: boolean;
  nonce?: string;
  accessToken?: string;
}

@Injectable()
export class OidcTokenValidator {
  private readonly logger: Logger;

  constructor(
    private readonly config: AuthConfigService,
    @Inject(WindowToken) private readonly window: Window
  ) {
    this.logger = this.config.loggerFactory('OidcTokenValidator');
  }

  public async verify(idToken: string, options: ValidationOptions): Promise<UserInfo> {
    const result = await this.validateSignature(idToken);
    await this.validateAccessTokenHash(result, options);
    this.validateIssuer(result.payload);
    this.validateAudience(result.payload);
    this.validateTime(result.payload);
    this.validateNonce(result.payload, options.nonce);

    if (!result.payload.sub) {
      throw new Error('No sub given');
    }

    return {
      ...result.payload,
      sub: result.payload.sub!
    };
  }

  private async validateSignature(idToken: string): Promise<JWTVerifyResult> {
    const keys = this.config.getProviderConfiguration().publicKeys;
    if (keys && keys.length > 0) {
      const getKey = (header: JWTHeaderParameters) => this.getKey(header, keys);
      const verifyResult = await jwtVerify(idToken, getKey, {});
      const headers = verifyResult.protectedHeader;
      this.validateAlgorithm(headers);
      return verifyResult;
    } else {
      this.logger.info('No keys defined, do not verify id token');
      const decoder = new TextDecoder();
      const { 0: encodedHeader, 1: encodedPayload } = idToken.split('.');
      const headers = JSON.parse(decoder.decode(base64url.decode(encodedHeader)));
      this.validateAlgorithm(headers);
      const claims = JSON.parse(decoder.decode(base64url.decode(encodedPayload)));
      return { payload: claims, protectedHeader: headers };
    }
  }

  private async getKey(
    headers: JWTHeaderParameters,
    publicKeys: JWK[]
  ): Promise<KeyLike | Uint8Array> {
    const sigKeys = publicKeys
      .filter((k) => !headers.alg || !k.alg || k.alg === headers.alg)
      .filter((k) => !k.use || k.use == 'sig');
    if (sigKeys.length === 0) {
      this.logger.error('No signature keys given');
      throw new Error('No valid signature key found');
    }
    if (!headers.kid && sigKeys.length == 1) {
      return importJWK(sigKeys[0]);
    }
    if (!headers.kid) {
      this.logger.error('Multiple signature keys but no kid keys given, take first');
      return importJWK(sigKeys[0]);
    }
    const keys = sigKeys.filter((k) => k.kid === headers.kid);
    if (keys.length == 0) {
      this.logger.error('No key with kid ' + headers.kid + ' could be found in the key set');
      throw new Error('No valid key found');
    }
    return importJWK(keys[0], headers.alg);
  }

  private async validateAccessTokenHash(result: JWTVerifyResult, options: ValidationOptions) {
    const at_hash_claim = result.payload['at_hash'] as string;
    const accessToken = options.accessToken;
    if (!accessToken && at_hash_claim) {
      throw new Error('at_hash set but no access token given');
    }
    if (!accessToken) {
      return;
    }
    if (!at_hash_claim && options.implicit) {
      throw new Error('at_hash not set but this is required');
    }
    if (!at_hash_claim) {
      return;
    }
    const hashAlgorithm = this.getHashAlgorithm(result.protectedHeader.alg);
    const actualHash = await this.computeHash(accessToken, hashAlgorithm);
    const expectedHash = this.base64UrlDecode(at_hash_claim);
    const len = actualHash.byteLength;
    for (var i = 0; i < len; i++) {
      if (actualHash[i] !== expectedHash[i]) {
        throw new Error('At-Hash not correct');
      }
    }
  }

  private getHashAlgorithm(jwtAlgorithm: string): string {
    const result = hashAlgorithms.get(jwtAlgorithm);
    if (!result) {
      throw new Error('Algorithm ' + jwtAlgorithm + ' not supported');
    }
    return result;
  }

  private async computeHash(accessToken: string, hashAlgorithm: string): Promise<Uint8Array> {
    const inputBuffer = new Uint8Array(accessToken.length);
    for (var i2 = 0, strLen = accessToken.length; i2 < strLen; i2++) {
      inputBuffer[i2] = accessToken.charCodeAt(i2);
    }
    const digest = await crypto.subtle.digest(hashAlgorithm, inputBuffer);
    return new Uint8Array(digest.slice(0, digest.byteLength / 2));
  }

  private base64UrlDecode(base64UrlStr: string): Uint8Array {
    const base64Str = base64UrlStr.replace(/-/g, '+').replace(/_/g, '/');
    const binary = this.window.atob(base64Str);
    const result = new Uint8Array(binary.length);
    for (var i = 0, strLen = binary.length; i < strLen; i++) {
      result[i] = binary.charCodeAt(i);
    }
    return result;
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
    if (typeof claims.aud === 'string') {
      if (claims.aud !== this.config.clientId) {
        throw new Error('ID-Token does not contain valid aud claim');
      }
    } else if (Array.isArray(claims.aud)) {
      if (!(claims.aud as string[]).includes(this.config.clientId)) {
        throw new Error('ID-Token does not contain correct aud claim');
      }
    } else {
      throw new Error('ID-Token does not contain valid aud claim');
    }
  }

  private validateAlgorithm(headers: JWTHeaderParameters) {
    const alg = this.config.getProviderConfiguration().alg;
    if (!alg && headers.alg !== 'RS256') {
      this.logger.info('Configured is RS256 (default), but used is ' + headers.alg);
      throw Error('Wrong ID-Token algorithm');
    }
    if (alg && !alg.includes(headers.alg)) {
      this.logger.info('Configured is ' + alg + ', but used is ' + headers.alg);
      throw Error('Wrong ID-Token algorithm');
    }
    return;
  }

  private validateTime(claims: JWTPayload) {
    const actualTime = Math.floor(Date.now() / 1000);
    if (!claims.exp) {
      throw new Error('exp claim required');
    }
    if (claims.exp <= actualTime - this.config.tokenTolerances.expTolerance) {
      throw new Error(
        'exp claim is ' + claims.exp + ' which is in the past. Current time is ' + actualTime
      );
    }
    if (!claims.iat) {
      throw new Error('iat claim required');
    }
    if (claims.iat > actualTime + this.config.tokenTolerances.iatTolerance) {
      throw new Error(
        'iat claim is ' + claims.iat + ' which is in the future. Current time is ' + actualTime
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
        'nbf claim is ' + claims.nbf + ' which is in the future. Current time is ' + actualTime
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
