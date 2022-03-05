import { APP_BASE_HREF } from '@angular/common';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { DocumentToken, WindowToken } from '../authentication-module.tokens';
import { OidcSilentLogin } from './oidc-silent-login';
import { AuthConfigService } from '../auth-config.service';
import { LocalUrl } from '../helper/local-url';
import { TokenStoreWrapper } from '../helper/token-store-wrapper';
import { OidcTokenResponse } from './oidc-token-response';
import { OidcCodeResponse } from './oidc-code-response';

const token =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.GjKRxKZWcBLTjWTOPSwFBoRsu0zuMkK-uh-7gdfiNDA';

const config = {
  clientId: 'id',
  provider: {
    authEndpoint: 'https://example.com/auth'
  },
  silentLogin: {
    timeoutInSecond: 1
  }
};

const windowMock = {
  addEventListener: jasmine.createSpy('addEventListener'),
  removeEventListener: jasmine.createSpy('removeEventListener '),
  location: { href: 'http://localhost', origin: 'http://localhost' }
};

const iframeMock = {
  setAttribute: jasmine.createSpy('setAttribute'),
  style: new Map()
};

const documentMock = {
  getElementById: jasmine.createSpy('getElementById'),
  body: jasmine.createSpyObj('body', ['appendChild']),
  createElement: jasmine.createSpy('createElement').and.returnValue(iframeMock)
};

const oidcTokenResponse = jasmine.createSpyObj('oidcTokenResponse', ['response']);
const oidcCodeResponse = jasmine.createSpyObj('oidcCodeResponse', ['response']);

let service: OidcSilentLogin;

describe('OidcSilentLogin', () => {
  beforeEach(() => {
    const authConfig = new AuthConfigService(config as any);
    const localUrl = {
      getLocalUrl: jasmine.createSpy('getLocalUrl').and.returnValue(new URL('https://localhost'))
    };

    const tokenStoreWrapper = jasmine.createSpyObj('TokenStoreWrapper', ['saveNonce']);

    TestBed.configureTestingModule({
      providers: [
        { provide: APP_BASE_HREF, useFactory: () => 'http://localhost/temp/' },
        { provide: OidcTokenResponse, useValue: oidcTokenResponse },
        { provide: OidcCodeResponse, useValue: oidcCodeResponse },
        { provide: WindowToken, useFactory: () => windowMock },
        { provide: DocumentToken, useFactory: () => documentMock },
        { provide: AuthConfigService, useValue: authConfig },
        { provide: LocalUrl, useValue: localUrl },
        { provide: TokenStoreWrapper, useValue: tokenStoreWrapper },
        OidcSilentLogin
      ]
    });
    service = TestBed.inject(OidcSilentLogin);
  });

  it('Silent Login Timeout', fakeAsync(() => {
    windowMock.addEventListener = jasmine.createSpy('addEventListener').and.callFake(() => {});
    oidcTokenResponse.response = jasmine.createSpy('handleURLResponse').and.returnValue(
      Promise.resolve({
        isLoggedIn: true,
        idToken: token,
        accessToken: 'SlAV32hkKG'
      })
    );

    const result = service.login({});
    tick(6000);
    expectAsync(result).toBeResolvedTo({ isLoggedIn: false });
  }));

  it('Silent Login Request', async () => {
    const mock = {
      origin: windowMock.location.origin,
      data: 'https://example.com/rd?error=failed',
      source: iframeMock
    };
    windowMock.addEventListener = jasmine
      .createSpy('addEventListener')
      .and.callFake((m, l) => l(mock));
    oidcTokenResponse.response = jasmine
      .createSpy('response')
      .and.returnValue(Promise.resolve({ isLoggedIn: false }));

    await service.login({});

    expect(iframeMock.setAttribute.calls.mostRecent().args[0]).toEqual('src');
    expect(iframeMock.setAttribute.calls.mostRecent().args[1]).toMatch('https://example.com/auth');
  });

  it('Silent Login Failed', async () => {
    const mock = {
      origin: windowMock.location.origin,
      data: 'https://example.com/rd?error=failed',
      source: iframeMock
    };
    windowMock.addEventListener = jasmine
      .createSpy('addEventListener')
      .and.callFake((m, l) => l(mock));
    oidcTokenResponse.response = jasmine
      .createSpy('response')
      .and.returnValue(Promise.resolve({ isLoggedIn: false }));

    const result = await service.login({});

    expect(oidcTokenResponse.response.calls.mostRecent().args[0]).toEqual({ error: 'failed' });
    expect(result).toEqual({ isLoggedIn: false });
  });

  it('Silent Login Success', async () => {
    const url =
      'https://example.com/rd?access_token=SlAV32hkKG&token_type=bearer&id_token=' +
      token +
      '&expires_in=3600&state=af0ifjsldkj';
    const mock = {
      origin: windowMock.location.origin,
      data: url,
      source: iframeMock
    };
    windowMock.addEventListener = jasmine
      .createSpy('addEventListener')
      .and.callFake((m, l) => l(mock));
    oidcTokenResponse.response = jasmine.createSpy('response').and.returnValue(
      Promise.resolve({
        isLoggedIn: true,
        idToken: token,
        accessToken: 'SlAV32hkKG'
      })
    );

    const result = await service.login({});

    expect(oidcTokenResponse.response.calls.mostRecent().args[0]).toEqual({
      stateMessage: 'af0ifjsldkj',
      expires_in: '3600',
      id_token:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.GjKRxKZWcBLTjWTOPSwFBoRsu0zuMkK-uh-7gdfiNDA',
      access_token: 'SlAV32hkKG'
    });
    expect(result).toEqual({
      isLoggedIn: true,
      idToken: token,
      accessToken: 'SlAV32hkKG'
    });
  });
});
