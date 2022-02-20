/* global setTimeout*/

// eslint-disable-next-line prettier/prettier
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthConfigService } from '../auth-config.service';
import { OauthConfig } from '../configuration/oauth-config';
import { OidcDiscovery } from './oidc-discovery';

const config = {
  clientId: 'test',
  redirectUri: 'https://example.com/rd',
  provider: 'https://example.com'
};

const metadataMock = {
  issuer: 'https://example.com',
  token_endpoint: 'https://example.com/te',
  authorization_endpoint: 'https://example.com/ae',
  jwks_uri: 'https://example.com/jwks',
  userinfo_endpoint: 'https://example.com/ui',
  check_session_iframe: 'https://example.com/cs',
  end_session_endpoint: 'https://example.com/es',
  id_token_signing_alg_values_supported: ['RSA256']
};

const jwksMock = {
  keys: []
};

let service: OidcDiscovery;
let configService: AuthConfigService;
let httpTestingController: HttpTestingController;

describe('OidcDiscovery', () => {
  beforeEach(() => {
    configService = new AuthConfigService(config as OauthConfig);
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: AuthConfigService, useValue: configService },
        OidcDiscovery
      ]
    });

    httpTestingController = TestBed.inject(HttpTestingController);
    service = TestBed.inject(OidcDiscovery);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('Valid', async () => {
    const promise = service.discover();

    const req = httpTestingController.expectOne(
      'https://example.com/.well-known/openid-configuration'
    );
    expect(req.request.method).toEqual('GET');
    req.flush(metadataMock);

    setTimeout(() => {
      const req2 = httpTestingController.expectOne('https://example.com/jwks');
      expect(req2.request.method).toEqual('GET');
      req2.flush(jwksMock);
    }, 100);

    await promise;

    expect(configService.getProviderConfiguration()).toEqual({
      issuer: 'https://example.com',
      tokenEndpoint: 'https://example.com/te',
      authEndpoint: 'https://example.com/ae',
      alg: ['RSA256'],
      publicKeys: [],
      checkSessionIframe: 'https://example.com/cs'
    });
  });

  it('Failed Config', (done) => {
    const promise = service.discover();

    const req = httpTestingController.expectOne(
      'https://example.com/.well-known/openid-configuration'
    );
    expect(req.request.method).toEqual('GET');
    req.flush({}, { status: 500, statusText: 'Error' });

    promise.then(() => done.fail('This should not work')).catch(() => done());
    expect(() => configService.getProviderConfiguration()).toThrow();
  });

  it('Invalid Answer', (done) => {
    const promise = service.discover();

    const req = httpTestingController.expectOne(
      'https://example.com/.well-known/openid-configuration'
    );
    expect(req.request.method).toEqual('GET');
    req.flush({ something: 'Weird' });

    promise.then(() => done.fail('This should not work')).catch(() => done());
    expect(() => configService.getProviderConfiguration()).toThrow();
  });

  it('Failed JWKS', (done) => {
    const promise = service.discover();

    const req = httpTestingController.expectOne(
      'https://example.com/.well-known/openid-configuration'
    );
    expect(req.request.method).toEqual('GET');
    req.flush(metadataMock);

    setTimeout(() => {
      const req2 = httpTestingController.expectOne('https://example.com/jwks');
      expect(req2.request.method).toEqual('GET');
      req2.flush({}, { status: 500, statusText: 'Error' });
    }, 100);

    promise.then(() => done.fail('This should not work')).catch(() => done());
    expect(() => configService.getProviderConfiguration()).toThrow();
  });
});
