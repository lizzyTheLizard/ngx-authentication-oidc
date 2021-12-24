import { ClientConfig } from "../configuration/client-config";
import { ProviderConfig } from "../configuration/provider-config";
import { ValidatorService } from "./validator.service";

const config: ClientConfig = {
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

const nonce = "12231232";

const claims =  {
  iss: pc.issuer,
  aud: [config.clientId],
  exp: Date.now() + 10000,
  iat: Date.now() - 10,
  nbf: Date.now() - 10,
  nonce: nonce
}

const headers = {
  alg: pc.alg![0],
}

let validator: ValidatorService;


describe('Validator', () => {
  beforeEach(() => {
    validator = new ValidatorService({client: config} as any);
    validator.setProviderConfig(pc);

  });

  it("Valid", async () => {
    validator.validate(claims, headers, nonce);
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
    validator.validate({...claims, aud: config.clientId }, headers, nonce);
  });

  it("Wrong Single Audience", async () => {
    expect(() => validator.validate({...claims, aud: "http://test"}, headers, nonce)).toThrow();
  });

  it("Multiple Audience", async () => {
    validator.validate({...claims, aud: ["1", config.clientId] }, headers, nonce);
  });

  it("Wrong Multiple Audience", async () => {
    expect(() => validator.validate({...claims, aud: ["1", "2"] }, headers, nonce)).toThrow();
  });

  it("exp missing", async () => {
    expect(() => validator.validate({...claims, exp: undefined }, headers, nonce)).toThrow();
  });

  it("exp in past", async () => {
    expect(() => validator.validate({...claims, exp: Date.now() - 1000 }, headers, nonce)).toThrow();
  });

  it("iat missing", async () => {
    expect(() => validator.validate({...claims, iat: undefined }, headers, nonce)).toThrow();
  });

  it("iat in Future", async () => {
    expect(() => validator.validate({...claims, iat: Date.now() + 100 }, headers, nonce)).toThrow();
  });

  it("nbf in Future", async () => {
    expect(() => validator.validate({...claims, nbf: Date.now() + 100 }, headers, nonce)).toThrow();
  });

  it("No Nonce returned", async () => {
    expect(() => validator.validate({...claims, nonce: undefined }, headers, nonce)).toThrow();
  });

  it("Wrong Nonce", async () => {
    expect(() => validator.validate(claims, headers, "1323332")).toThrow();
  });

  it("No Nonce Send", async () => {
    validator.validate({...claims, nonce: undefined }, headers, undefined);
  });
});
