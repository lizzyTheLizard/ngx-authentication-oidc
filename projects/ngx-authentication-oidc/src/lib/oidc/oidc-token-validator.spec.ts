/* global window */
import { TestBed } from '@angular/core/testing';
import { JWTHeaderParameters, JWTPayload, SignJWT, importJWK } from 'jose';
import { AuthConfigService } from '../auth-config.service';
import { WindowToken } from '../authentication-module.tokens';
import { OidcTokenValidator } from './oidc-token-validator';

const config = {
  provider: {
    authEndpoint: 'http://xx',
    tokenEndpoint: 'http://xx',
    issuer: 'http://xx',
    alg: ['HS256'],
    publicKeys: [
      {
        kty: 'oct',
        alg: 'HS256',
        k: 'eW91ci0yNTYtYml0LXNlY3JldA',
        ext: true
      },
      {
        kty: 'oct',
        alg: 'HS512',
        k: 'eW91ci0yNTYtYml0LXNlY3JldA',
        ext: true
      }
    ],
    maxAge: 10000
  },
  clientId: 'id',
  redirectUri: 'http://xxx'
};

const nonce = '12231232';

const claims = {
  sub: '1234',
  iss: config.provider.issuer,
  aud: [config.clientId],
  exp: getCurrentTime() + 10,
  iat: getCurrentTime() - 1,
  nbf: getCurrentTime() - 1,
  nonce: nonce
};

// eslint-disable-next-line prettier/prettier
const accessToken = "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJfVjBLVjZEVW1yMzdmUjdONy1zaXQ5eURFSDZPZ0FWX1ZSakVkRDcxMUd3In0.eyJleHAiOjE2NDU5MDM2ODAsImlhdCI6MTY0NTkwMzM4MCwiYXV0aF90aW1lIjoxNjQ1OTAzMzgwLCJqdGkiOiIxNmE0Yjc3ZS01YjkxLTQ2OTItYjBlNC00MGIwMmQ2MGE1YTciLCJpc3MiOiJodHRwOi8vbG9jYWxob3N0OjgwODAvYXV0aC9yZWFsbXMvVGVzdC1BcHBsaWNhdGlvbiIsImF1ZCI6ImFjY291bnQiLCJzdWIiOiJkZTc4YzU2Zi1mYTBmLTQ2Y2QtYjQwZi1kOTFmYTZlNDZiOWMiLCJ0eXAiOiJCZWFyZXIiLCJhenAiOiJrZXljbG9hay1zYW1wbGUiLCJub25jZSI6IjIxODcxNzUxMzEiLCJzZXNzaW9uX3N0YXRlIjoiOGVmY2Y0ZGQtZjkwMy00ZWU3LTljMDgtNmEzZTI3YjA5OTkwIiwiYWNyIjoiMSIsImFsbG93ZWQtb3JpZ2lucyI6WyJodHRwOi8vbG9jYWxob3N0OjQyMDAiXSwicmVhbG1fYWNjZXNzIjp7InJvbGVzIjpbImRlZmF1bHQtcm9sZXMtdGVzdC1hcHBsaWNhdGlvbiIsIm9mZmxpbmVfYWNjZXNzIiwidW1hX2F1dGhvcml6YXRpb24iXX0sInJlc291cmNlX2FjY2VzcyI6eyJhY2NvdW50Ijp7InJvbGVzIjpbIm1hbmFnZS1hY2NvdW50IiwibWFuYWdlLWFjY291bnQtbGlua3MiLCJ2aWV3LXByb2ZpbGUiXX19LCJzY29wZSI6Im9wZW5pZCBlbWFpbCBwaG9uZSBwcm9maWxlIiwic2lkIjoiOGVmY2Y0ZGQtZjkwMy00ZWU3LTljMDgtNmEzZTI3YjA5OTkwIiwiZW1haWxfdmVyaWZpZWQiOmZhbHNlLCJuYW1lIjoidGVzdCB0ZXN0IiwicHJlZmVycmVkX3VzZXJuYW1lIjoidGVzdCIsImdpdmVuX25hbWUiOiJ0ZXN0IiwiZmFtaWx5X25hbWUiOiJ0ZXN0IiwiZW1haWwiOiJ0ZXN0QHRlc3QuY29tIn0.DQgbuUGHhl7mo2sQktW-SadSzYjbuqIj8-D1Ywyb3M5kJ3TTsFv8s7sRCwXeVj55rKOeWFy7HQ6j5DWS9BDeDHVCE_2PBz5eZwkxD1yKbqsVFDtqUryroRdpvwg5MH2kUUDFl1QNQmZd8PQWIRkDPVGLKgo_DYYbOTHueFQ5lXQsqoxpXizfnE1BfIyD5Z5_Nu3QBAM7ySRNCFJgc_VPNYzxSFsbPYvKvWcD01S27PT-czy8sTjEnDBAbQ6oZ2ICuhN2BlokZ7yZMX4itZPxcwtM-1nE6Va34fs3N2Ilshe5xxfr07z4IVP61TwQ11UgHd93x6RHW4-xVG45Lg84SA";

let service: OidcTokenValidator;
let authConfig: AuthConfigService;

function getCurrentTime(): number {
  return Math.floor(Date.now() / 1000);
}

async function writeToken(claims: JWTPayload, headers?: JWTHeaderParameters): Promise<string> {
  const encryptor = new SignJWT(claims);
  encryptor.setProtectedHeader(headers ?? { alg: 'HS256' });
  const key = await importJWK(config.provider.publicKeys[0]);
  return await encryptor.sign(key);
}

describe('OidcTokenValidator', () => {
  beforeEach(() => {
    authConfig = new AuthConfigService(config);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthConfigService, useValue: authConfig },
        { provide: WindowToken, useValue: window },
        OidcTokenValidator
      ]
    });
    service = TestBed.inject(OidcTokenValidator);
  });

  it('Valid', async () => {
    const token = await writeToken(claims);
    await expectAsync(service.verify(token, { nonce: nonce, implicit: false })).toBeResolved();
  });

  it('Wrong Signature', async () => {
    const originalToken = await writeToken(claims);
    const token = originalToken.substring(0, -1) + 'A';
    await expectAsync(service.verify(token, { nonce: nonce, implicit: false })).toBeRejected();
  });

  it('Wrong Signature but no keys', async () => {
    const oldKeys = config.provider.publicKeys;

    const originalToken = await writeToken(claims);
    config.provider.publicKeys = [];
    const token = originalToken.substring(0, originalToken.length - 1) + 'A';

    await expectAsync(service.verify(token, { nonce: nonce, implicit: false })).toBeResolved();

    config.provider.publicKeys = oldKeys;
  });

  it('Missing Issuer', async () => {
    const token = await writeToken({ ...claims, iss: undefined });
    await expectAsync(service.verify(token, { nonce: nonce, implicit: false })).toBeRejected();
  });

  it('Wrong Issuer', async () => {
    const token = await writeToken({ ...claims, iss: 'http://test.com' });
    await expectAsync(service.verify(token, { nonce: nonce, implicit: false })).toBeRejected();
  });

  it('Missing Audience', async () => {
    const token = await writeToken({ ...claims, aud: undefined });
    await expectAsync(service.verify(token, { nonce: nonce, implicit: false })).toBeRejected();
  });

  it('Single Audience', async () => {
    const token = await writeToken({ ...claims, aud: config.clientId });
    await expectAsync(service.verify(token, { nonce: nonce, implicit: false })).toBeResolved();
  });

  it('Wrong Single Audience', async () => {
    const token = await writeToken({ ...claims, aud: '1' });
    await expectAsync(service.verify(token, { nonce: nonce, implicit: false })).toBeRejected();
  });

  it('Multiple Audience', async () => {
    const token = await writeToken({
      ...claims,
      aud: ['1', config.clientId]
    });
    await expectAsync(service.verify(token, { nonce: nonce, implicit: false })).toBeResolved();
  });

  it('Wrong Multiple Audience', async () => {
    const token = await writeToken({ ...claims, aud: ['1', '2'] });
    await expectAsync(service.verify(token, { nonce: nonce, implicit: false })).toBeRejected();
  });

  it('exp missing', async () => {
    const token = await writeToken({ ...claims, exp: undefined });
    await expectAsync(service.verify(token, { nonce: nonce, implicit: false })).toBeRejected();
  });

  it('exp in past', async () => {
    const token = await writeToken({ ...claims, exp: getCurrentTime() - 10 });
    await expectAsync(service.verify(token, { nonce: nonce, implicit: false })).toBeRejected();
  });

  it('iat missing', async () => {
    const token = await writeToken({ ...claims, iat: undefined });
    await expectAsync(service.verify(token, { nonce: nonce, implicit: false })).toBeRejected();
  });

  it('iat in Future', async () => {
    const token = await writeToken({ ...claims, iat: getCurrentTime() + 10 });
    await expectAsync(service.verify(token, { nonce: nonce, implicit: false })).toBeRejected();
  });

  it('nbf in Future', async () => {
    const token = await writeToken({ ...claims, nbf: getCurrentTime() + 10 });
    await expectAsync(service.verify(token, { nonce: nonce, implicit: false })).toBeRejected();
  });

  it('No Nonce returned', async () => {
    const token = await writeToken({ ...claims, nonce: undefined });
    await expectAsync(service.verify(token, { nonce: nonce, implicit: false })).toBeRejected();
  });

  it('Wrong Nonce', async () => {
    const token = await writeToken({ ...claims, nonce: '123' });
    await expectAsync(service.verify(token, { nonce: nonce, implicit: false })).toBeRejected();
  });

  it('No Nonce Send', async () => {
    const token = await writeToken({ ...claims, nonce: undefined });
    await expectAsync(service.verify(token, { implicit: false })).toBeResolved();
  });

  it('No at_hash', async () => {
    const token = await writeToken({ ...claims, at_hash: undefined });
    await expectAsync(
      service.verify(token, { nonce: nonce, implicit: true, accessToken: accessToken })
    ).toBeRejected();
  });

  it('No at_hash OK if code flow', async () => {
    const token = await writeToken({ ...claims, at_hash: undefined });
    await expectAsync(
      service.verify(token, { nonce: nonce, implicit: false, accessToken: accessToken })
    ).toBeResolved();
  });

  it('Wrong at_hash', async () => {
    const token = await writeToken({ ...claims, at_hash: 'ykQb7CFN9R9DXcyE5lt' });
    await expectAsync(
      service.verify(token, { nonce: nonce, implicit: false, accessToken: accessToken })
    ).toBeRejected();
  });

  it('Correct at_hash', async () => {
    const token = await writeToken({ ...claims, at_hash: 'ykQb7CFN9R9DXcyE5ltG9w' });
    await expectAsync(
      service.verify(token, { nonce: nonce, implicit: false, accessToken: accessToken })
    ).toBeResolved();
  });

  it('Wrong algorithm', async () => {
    const token = await writeToken(claims, { alg: 'HS512' });
    await expectAsync(service.verify(token, { nonce: nonce, implicit: false })).toBeRejected();
  });
});
