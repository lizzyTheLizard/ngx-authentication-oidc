import { TestBed } from '@angular/core/testing';
import { JWTPayload, SignJWT, importJWK } from 'jose';
import { AuthConfigService } from '../auth-config.service';
import { LoggerFactoryToken } from '../logger/logger';
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
      }
    ],
    maxAge: 10000
  },
  client: {
    clientId: 'id',
    redirectUri: 'http://xxx'
  }
};

const nonce = '12231232';

const claims = {
  sub: '1234',
  iss: config.provider.issuer,
  aud: [config.client.clientId],
  exp: getCurrentTime() + 10,
  iat: getCurrentTime() - 1,
  nbf: getCurrentTime() - 1,
  nonce: nonce
};

let service: OidcTokenValidator;

function getCurrentTime(): number {
  return Math.floor(Date.now() / 1000);
}

async function writeToken(claims: JWTPayload): Promise<string> {
  const encryptor = new SignJWT(claims);
  encryptor.setProtectedHeader({ alg: 'HS256' });
  const key = await importJWK(config.provider.publicKeys[0]);
  return await encryptor.sign(key);
}

describe('OidcTokenValidator', () => {
  beforeEach(() => {
    const authConfig = new AuthConfigService(config);
    authConfig.setProviderConfiguration(config.provider);

    TestBed.configureTestingModule({
      providers: [
        { provide: LoggerFactoryToken, useValue: () => console },
        { provide: AuthConfigService, useValue: authConfig },
        OidcTokenValidator
      ]
    });
    service = TestBed.inject(OidcTokenValidator);
  });

  it('Valid', async () => {
    const token = await writeToken(claims);
    await expectAsync(service.verify(token, nonce)).toBeResolved();
  });

  it('Missing Issuer', async () => {
    const token = await writeToken({ ...claims, iss: undefined });
    await expectAsync(service.verify(token, nonce)).toBeRejected();
  });

  it('Wrong Issuer', async () => {
    const token = await writeToken({ ...claims, iss: 'http://test.com' });
    await expectAsync(service.verify(token, nonce)).toBeRejected();
  });

  it('Missing Audience', async () => {
    const token = await writeToken({ ...claims, aud: undefined });
    await expectAsync(service.verify(token, nonce)).toBeRejected();
  });

  it('Single Audience', async () => {
    const token = await writeToken({ ...claims, aud: config.client.clientId });
    await expectAsync(service.verify(token, nonce)).toBeResolved();
  });

  it('Wrong Single Audience', async () => {
    const token = await writeToken({ ...claims, aud: '1' });
    await expectAsync(service.verify(token, nonce)).toBeRejected();
  });

  it('Multiple Audience', async () => {
    const token = await writeToken({
      ...claims,
      aud: ['1', config.client.clientId]
    });
    await expectAsync(service.verify(token, nonce)).toBeResolved();
  });

  it('Wrong Multiple Audience', async () => {
    const token = await writeToken({ ...claims, aud: ['1', '2'] });
    await expectAsync(service.verify(token, nonce)).toBeRejected();
  });

  it('exp missing', async () => {
    const token = await writeToken({ ...claims, exp: undefined });
    await expectAsync(service.verify(token, nonce)).toBeRejected();
  });

  it('exp in past', async () => {
    const token = await writeToken({ ...claims, exp: getCurrentTime() - 10 });
    await expectAsync(service.verify(token, nonce)).toBeRejected();
  });

  it('iat missing', async () => {
    const token = await writeToken({ ...claims, iat: undefined });
    await expectAsync(service.verify(token, nonce)).toBeRejected();
  });

  it('iat in Future', async () => {
    const token = await writeToken({ ...claims, iat: getCurrentTime() + 1 });
    await expectAsync(service.verify(token, nonce)).toBeRejected();
  });

  it('nbf in Future', async () => {
    const token = await writeToken({ ...claims, nbf: getCurrentTime() + 1 });
    await expectAsync(service.verify(token, nonce)).toBeRejected();
  });

  it('No Nonce returned', async () => {
    const token = await writeToken({ ...claims, nonce: undefined });
    await expectAsync(service.verify(token, nonce)).toBeRejected();
  });

  it('Wrong Nonce', async () => {
    const token = await writeToken({ ...claims, nonce: '123' });
    await expectAsync(service.verify(token, nonce)).toBeRejected();
  });

  it('No Nonce Send', async () => {
    const token = await writeToken({ ...claims, nonce: undefined });
    await expectAsync(service.verify(token)).toBeResolved();
  });
});
