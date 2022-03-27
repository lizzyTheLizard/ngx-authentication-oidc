/* globals window */
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { OauthConfig } from '../configuration/oauth-config';
import { OidcLogin } from './oidc-login';
import { WindowToken } from '../authentication-module.tokens';
import { AuthConfigService } from '../auth-config.service';
import { UrlHelper } from '../helper/url-helper';
import { OidcAuthenticationRequest } from './oidc-authentication-request';

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

    const authenticationRequest = {
      generateRequest: jasmine
        .createSpy('generateRequest')
        .and.returnValue(new URL('https://example.com/auth?test=123'))
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: WindowToken, useFactory: () => windowMock },
        { provide: AuthConfigService, useValue: authConfig },
        { provide: UrlHelper, useValue: localUrl },
        { provide: OidcAuthenticationRequest, useValue: authenticationRequest },
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
      finalRoute: '/final'
    };

    service.login(loginOptions);

    window.setTimeout(() => {
      const url = new URL(windowMock.location.href);
      expect(url.toString()).toEqual('https://example.com/auth?test=123');
      done();
    }, 20);
  });
});
