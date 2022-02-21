declare module 'oidc-token-hash' {
  export module oidcTokenHash {
    export interface Names {
      source: string;
      claim: string;
    }
    export function generate(token: string, alg: string, crv?: string): string;
    export function validate(
      names: Names,
      actual: string,
      source: string,
      alg: string,
      crv?: string
    ): void;
  }
}
