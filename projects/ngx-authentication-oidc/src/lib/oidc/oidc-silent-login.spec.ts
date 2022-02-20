import { APP_BASE_HREF } from '@angular/common';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { DocumentToken, WindowToken } from '../authentication-module.tokens';
import { OidcResponse } from './oidc-response';
import { OidcSilentLogin } from './oidc-silent-login';
import { AuthConfigService } from '../auth-config.service';
import { LocalUrl } from '../helper/local-url';

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

const oidcResponse = jasmine.createSpyObj('oidcResponse', ['urlResponse']);

let service: OidcSilentLogin;

describe('OidcSilentLogin', () => {
  beforeEach(() => {
    const authConfig = new AuthConfigService(config as any);
    const localUrl = {
      getLocalUrl: jasmine.createSpy('getLocalUrl').and.returnValue(new URL('https://localhost'))
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: APP_BASE_HREF, useFactory: () => 'http://localhost/temp/' },
        { provide: OidcResponse, useValue: oidcResponse },
        { provide: WindowToken, useFactory: () => windowMock },
        { provide: DocumentToken, useFactory: () => documentMock },
        { provide: AuthConfigService, useValue: authConfig },
        { provide: LocalUrl, useValue: localUrl },
        OidcSilentLogin
      ]
    });
    service = TestBed.inject(OidcSilentLogin);
  });

  it('Silent Login Timeout', fakeAsync(() => {
    windowMock.addEventListener = jasmine.createSpy('addEventListener').and.callFake(() => {});
    oidcResponse.urlResponse = jasmine.createSpy('handleURLResponse').and.returnValue(
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
    oidcResponse.urlResponse = jasmine
      .createSpy('handleURLResponse')
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
    oidcResponse.urlResponse = jasmine
      .createSpy('handleURLResponse')
      .and.returnValue(Promise.resolve({ isLoggedIn: false }));

    const result = await service.login({});

    expect(oidcResponse.urlResponse.calls.mostRecent().args[0]).toEqual(new URL(mock.data));
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
    oidcResponse.urlResponse = jasmine.createSpy('handleURLResponse').and.callFake(() => {
      return Promise.resolve({
        isLoggedIn: true,
        idToken: token,
        accessToken: 'SlAV32hkKG'
      });
    });

    const result = await service.login({});

    expect(oidcResponse.urlResponse.calls.mostRecent().args[0]).toEqual(new URL(mock.data));
    expect(result).toEqual({
      isLoggedIn: true,
      idToken: token,
      accessToken: 'SlAV32hkKG'
    });
  });
});
