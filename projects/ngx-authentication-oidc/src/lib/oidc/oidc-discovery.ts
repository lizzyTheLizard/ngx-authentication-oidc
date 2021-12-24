import { HttpClient } from "@angular/common/http";
import { JWK } from "jose";
import { firstValueFrom } from "rxjs";
import { ProviderConfig } from "../configuration/provider-config";

interface Metadata {
  issuer: string,
  token_endpoint: string;
  authorization_endpoint: string;
  jwks_uri?: string;
  userinfo_endpoint?: string;
  check_session_iframe?: string;
  end_session_endpoint?: string;
  id_token_signing_alg_values_supported: string[];
}
  
interface Jwks {
  keys: JWK[]
}  

export async function oidcDiscovery(httpClient: HttpClient, issuer: string): Promise<ProviderConfig>{
  const url = (issuer.endsWith('/') ? issuer.slice(0,-1) : issuer) + "/.well-known/openid-configuration";
  const metadata = await firstValueFrom(httpClient.get<Metadata>(url));
  const jwksUri = metadata.jwks_uri ?? undefined;
  const jwks = jwksUri ? await firstValueFrom(httpClient.get<Jwks>(jwksUri)) : undefined;
  return {
    issuer: metadata.issuer,
    tokenEndpoint: metadata.token_endpoint,
    authEndpoint: metadata.authorization_endpoint,
    alg: metadata.id_token_signing_alg_values_supported,
    publicKeys: jwks ? jwks.keys : [],
  }
}
