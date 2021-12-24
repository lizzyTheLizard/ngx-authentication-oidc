import { JWK } from "jose";

export interface ProviderConfig {
    issuer: any;
    alg?: string[];
    maxAge?: number;
    tokenEndpoint: string;
    authEndpoint: string;
    publicKeys: JWK[]
}
