/* globals window */
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { OauthConfig } from '../configuration/oauth-config';
import { OidcLogin } from './oidc-login';
import { WindowToken } from '../authentication-module.tokens';
import { AuthConfigService } from '../auth-config.service';
import { LocalUrl } from '../helper/local-url';
import { TokenStoreWrapper } from '../helper/token-store-wrapper';

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
  redirectUri: 'https://example.com/rd',
  clientId: 'id'
};

const windowMock = {
  addEventListener: jasmine.createSpy('addEventListener'),
  removeEventListener: jasmine.createSpy('removeEventListener '),
  setTimeout: jasmine.createSpy('setTimeout'),
  btoa: (str: string) => window.btoa(str),
  atob: (str: string) => window.atob(str),
  location: { href: 'http://localhost', origin: 'http://localhost' }
};

let httpTestingController: HttpTestingController;
let service: OidcLogin;

describe('OidcLogin', () => {
  beforeEach(() => {
    const localUrl = {
      getLocalUrl: jasmine.createSpy('getLocalUrl').and.returnValue(new URL('https://localhost'))
    };
    const authConfig = new AuthConfigService(config as OauthConfig);
    const tokenStoreWrapper = jasmine.createSpyObj('TokenStoreWrapper', [
      'saveNonce',
      'saveCodeVerifier'
    ]);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: WindowToken, useFactory: () => windowMock },
        { provide: AuthConfigService, useValue: authConfig },
        { provide: LocalUrl, useValue: localUrl },
        { provide: TokenStoreWrapper, useValue: tokenStoreWrapper },
        OidcLogin
      ]
    });

    httpTestingController = TestBed.inject(HttpTestingController);
    service = TestBed.inject(OidcLogin);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('Login', (done) => {
    const loginOptions = {
      state: 'test',
      finalUrl: 'https://example.com/final'
    };

    service.login(loginOptions);

    window.setTimeout(() => {
      const url = new URL(windowMock.location.href);
      expect(url.pathname).toEqual('/auth');
      expect(url.searchParams.get('response_type')).toEqual('code');
      expect(url.searchParams.get('scope')).toEqual('openid profile email phone');
      expect(url.searchParams.get('client_id')).toEqual('id');
      expect(JSON.parse(url.searchParams.get('state')!)).toEqual({
        stateMessage: 'test',
        finalUrl: 'https://example.com/final'
      });
      expect(url.searchParams.get('redirect_uri')).toEqual('https://example.com/rd');
      expect(url.searchParams.has('nonce')).toBeTrue();
      done();
    }, 20);
  });
});
