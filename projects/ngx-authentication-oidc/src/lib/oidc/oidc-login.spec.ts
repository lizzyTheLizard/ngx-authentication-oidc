import {
  HttpClientTestingModule,
  HttpTestingController
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { LoggerFactoryToken } from '../logger/logger';
import { OauthConfig, ProviderConfig } from '../configuration/oauth-config';
import { OidcLogin } from './oidc-login';
import { WindowToken } from '../authentication-module.tokens';
import { AuthConfigService } from '../auth-config.service';

const config = {
  provider: {
    authEndpoint: 'https://example.com/auth',
    tokenEndpoint: 'https://example.com/token',
    issuer: 'http://example.com',
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
    redirectUri: 'https://example.com/rd',
    clientId: 'id'
  }
};

const windowMock = {
  addEventListener: jasmine.createSpy('addEventListener'),
  removeEventListener: jasmine.createSpy('removeEventListener '),
  setTimeout: jasmine.createSpy('setTimeout'),
  location: { href: 'http://localhost', origin: 'http://localhost' }
};

let httpTestingController: HttpTestingController;
let service: OidcLogin;

describe('OidcLogin', () => {
  beforeEach(() => {
    const authConfig = new AuthConfigService(config as OauthConfig);
    authConfig.setProviderConfiguration(config.provider as ProviderConfig);
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: WindowToken, useFactory: () => windowMock },
        { provide: LoggerFactoryToken, useValue: () => console },
        { provide: AuthConfigService, useValue: authConfig },
        OidcLogin
      ]
    });

    httpTestingController = TestBed.inject(HttpTestingController);
    service = TestBed.inject(OidcLogin);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('Login', () => {
    const loginOptions = {
      stateMessage: 'test',
      finalUrl: 'https://example.com/final'
    };

    service.login(loginOptions);

    const url = new URL(windowMock.location.href);
    expect(url.pathname).toEqual('/auth');
    expect(url.searchParams.get('response_type')).toEqual('code');
    expect(url.searchParams.get('scope')).toEqual('openid profile');
    expect(url.searchParams.get('client_id')).toEqual('id');
    expect(JSON.parse(url.searchParams.get('state')!)).toEqual({
      stateMessage: 'test',
      finalUrl: 'https://example.com/final'
    });
    expect(url.searchParams.get('redirect_uri')).toEqual(
      'https://example.com/rd'
    );
    expect(url.searchParams.has('nonce')).toBeTrue();
  });
});
