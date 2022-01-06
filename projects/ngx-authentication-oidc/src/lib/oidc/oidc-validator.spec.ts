import { AuthConfigService } from "../auth-config.service";
import { ClientConfig, ProviderConfig } from "../configuration/oauth-config";
import { OidcValidator } from "./oidc-validator";

const cc: ClientConfig = {
  clientId: 'id',
  redirectUri: "http://xxx"
}

const pc: ProviderConfig = {
  authEndpoint: "http://xx",
  tokenEndpoint: "http://xx",
  issuer: "http://xx",
  alg: ["RSA512"],
  publicKeys: [],
  maxAge: 10000
}

const config: AuthConfigService = {
  getProviderConfiguration: jasmine.createSpy('getProviderConfiguration').and.returnValue(pc),
  client: cc,
} as any;

const nonce = "12231232";

const claims =  {
  iss: pc.issuer,
  aud: [cc.clientId],
  exp: getCurrentTime() + 10,
  iat: getCurrentTime() - 1,
  nbf: getCurrentTime() - 1,
  nonce: nonce
}

const headers = {
  alg: pc.alg![0],
}

let validator: OidcValidator;

function getCurrentTime() : number{
  return Math.floor(Date.now()/1000);
}

describe('OidcValidator', () => {
  beforeEach(() => {
    validator = new OidcValidator(config);
  });

  it("Valid", async () => {
    expect(() => validator.validate(claims, headers, nonce)).not.toThrow();
  });

  it("Missing Issuer", async () => {
    expect(() => validator.validate({...claims, iss: undefined}, headers, nonce)).toThrow();
  });

  it("Wrong Issuer", async () => {
    expect(() => validator.validate({...claims, iss: "http://test.com"}, headers, nonce)).toThrow();
  });

  it("Missing Audience", async () => {
    expect(() => validator.validate({...claims, aud: undefined}, headers, nonce)).toThrow();
  });

  it("Single Audience", async () => {
    expect(() => validator.validate({...claims, aud: cc.clientId }, headers, nonce)).not.toThrow();
  });

  it("Wrong Single Audience", async () => {
    expect(() => validator.validate({...claims, aud: "http://test"}, headers, nonce)).toThrow();
  });

  it("Multiple Audience", async () => {
    expect(() => validator.validate({...claims, aud: ["1", cc.clientId] }, headers, nonce)).not.toThrow();
  });

  it("Wrong Multiple Audience", async () => {
    expect(() => validator.validate({...claims, aud: ["1", "2"] }, headers, nonce)).toThrow();
  });

  it("exp missing", async () => {
    expect(() => validator.validate({...claims, exp: undefined }, headers, nonce)).toThrow();
  });

  it("exp in past", async () => {
    expect(() => validator.validate({...claims, exp: getCurrentTime() - 10 }, headers, nonce)).toThrow();
  });

  it("iat missing", async () => {
    expect(() => validator.validate({...claims, iat: undefined }, headers, nonce)).toThrow();
  });

  it("iat in Future", async () => {
    expect(() => validator.validate({...claims, iat: getCurrentTime() + 1 }, headers, nonce)).toThrow();
  });

  it("nbf in Future", async () => {
    expect(() => validator.validate({...claims, nbf: getCurrentTime() + 1 }, headers, nonce)).toThrow();
  });

  it("No Nonce returned", async () => {
    expect(() => validator.validate({...claims, nonce: undefined }, headers, nonce)).toThrow();
  });

  it("Wrong Nonce", async () => {
    expect(() => validator.validate(claims, headers, "1323332")).toThrow();
  });

  it("No Nonce Send", async () => {
    expect(() => validator.validate({...claims, nonce: undefined }, headers, undefined)).not.toThrow();
  });
});
