import { Injectable } from "@angular/core";
import { AuthConfigService } from "../auth-config.service";
import { ClientConfig } from "../configuration/client-config";
import { ProviderConfig } from "../configuration/provider-config";

interface Claims {
  iss?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
  nbf?: number;
  nonce?: string;
}

interface Header {
  alg?: string,
}

@Injectable()
export class ValidatorService {
  private readonly clientConfig: ClientConfig;
  private providerConfig?: ProviderConfig;

  constructor(config: AuthConfigService) { 
    this.clientConfig = config.client;
  }

  public setProviderConfig(providerConfig: ProviderConfig) {
    this.providerConfig = providerConfig;
  }    
          
  public validate(claims?: Claims, headers?: Header, nonce?: string){
    if(!claims) {
      throw new Error('No claims given')
    }
    if(!headers) {
      throw new Error('No headers given')
    }
    this.validateAccessTokenHash();
    this.validateIssuer(claims);
    this.validateAudience(claims);
    this.validateAlgorithm(headers);
    this.validateTime(claims);
    this.validateNonce(nonce, claims);
  }

  private validateAccessTokenHash() {
    //TODO: Validate at_hash according to 3.2.2.9
    /*
    Hash the octets of the ASCII representation of the access_token with the hash algorithm specified in JWA [JWA] for the alg Header Parameter of the ID Token's JOSE Header. For instance, if the alg is RS256, the hash algorithm used is SHA-256.
    Take the left-most half of the hash and base64url encode it.
    The value of at_hash in the ID Token MUST match the value produced in the previous step.
    */
  }

  private validateIssuer(claims: Claims) {
    if(!claims.iss){
      throw new Error('ID-Token contains invalid iss claim')
    }
    if(claims.iss !== this.providerConfig!.issuer) {
      throw new Error('ID-Token contains invalid iss claim')
    }
  }

  private validateAudience(claims: Claims) {
    if(!claims.aud) {
      throw new Error('ID-Token does not contain valid aud claim');
    }

    if(typeof(claims.aud) === 'string') {
      if(claims.aud !== this.clientConfig.clientId) {
        throw new Error('ID-Token does not contain valid aud claim');
      }
    } else if(Array.isArray(claims.aud)){
      if(!(claims.aud as string[]).includes(this.clientConfig.clientId)) {
        throw new Error('ID-Token does not contain correct aud claim');
      }
    } else {
      throw new Error('ID-Token does not contain valid aud claim');
    }
  }

  private validateAlgorithm(headers: Header) {
    if(!this.providerConfig!.alg && headers.alg !== "RS256") {
      throw Error('Wrong ID-Token algorithm')
    }
    if(!headers.alg) {
      throw Error('No algorithm defined')
    }
    if(this.providerConfig!.alg && !this.providerConfig!.alg.includes(headers.alg)) {
      throw Error('Wrong ID-Token algorithm')
    }
    if(!this.providerConfig!.alg && headers.alg !== "RS256") {
      throw Error('Wrong ID-Token algorithm')
    }
    return;
  }

  private validateTime(claims: Claims) {
    const actualTime = Date.now();
    if(!claims.exp) {
      throw new Error('exp claim required');
    }
    if(claims.exp <= actualTime) {
      throw new Error('exp claim is ' + claims.exp + ' which is in the past. Current time is ' + actualTime);
    }
    if(!claims.iat) {
      throw new Error('iat claim required');
    }
    if(claims.iat >= actualTime) {
      throw new Error('iat claim is ' + claims.nbf + ' which is in the future. Current time is ' + actualTime);
    }
    if(claims.nbf && claims.nbf >= actualTime) {
      throw new Error('nbf claim is ' + claims.nbf + ' which is in the future. Current time is ' + actualTime);
    }
    if(this.providerConfig!.maxAge && claims.iat < actualTime - this.providerConfig!.maxAge) {
      throw new Error('iat claim is ' + claims.iat + ' which is too old. Current time is ' + actualTime + ' and max age is ' + this.providerConfig!.maxAge);
    }
    return;
  }

  private validateNonce(nonce: string | undefined, claims: Claims) {
    if(nonce && nonce !== claims.nonce) {
      throw new Error("Nonce not returned");
    }
  }
}
