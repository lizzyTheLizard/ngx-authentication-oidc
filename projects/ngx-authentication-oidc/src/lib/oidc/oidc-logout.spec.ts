// eslint-disable-next-line prettier/prettier
import { TestBed } from '@angular/core/testing';
import { AuthConfigService } from '../auth-config.service';
import { OidcLogout } from './oidc-logout';
import { UrlHelper } from '../helper/url-helper';
import { WindowToken } from '../authentication-module.tokens';

const config = {
  silentLogin: { enabled: true }
};

let service: OidcLogout;
let localUrl: UrlHelper;
let windowMock: Window;
let authConfig: AuthConfigService;

describe('OidcLogout', () => {
  beforeEach(() => {
    authConfig = new AuthConfigService(config as any);
    localUrl = jasmine.createSpyObj('localUrl', ['getLocalUrl']);
    windowMock = jasmine.createSpyObj('windowMock', ['setTimeout']);
    (windowMock as any).location = {};
    TestBed.configureTestingModule({
      imports: [],
      providers: [
        { provide: AuthConfigService, useValue: authConfig },
        { provide: WindowToken, useValue: windowMock },
        { provide: UrlHelper, useValue: localUrl },
        OidcLogout
      ]
    });
    service = TestBed.inject(OidcLogout);
  });

  it('Logout without single logout', () => {
    authConfig.setProviderConfiguration({ endSessionEndpoint: undefined } as any);

    service.logout();
    expect(windowMock.location.href).toBeUndefined();
  });

  it('Logout with single logout', () => {
    authConfig.setProviderConfiguration({
      endSessionEndpoint: 'https://example.com/logout'
    } as any);
    localUrl.convertToAbsoluteUrl = jasmine
      .createSpy('getLocalUrl')
      .and.returnValue('https://example.com/redirect');

    service.logout();

    const result = new URL(windowMock.location.href);
    expect(result.hostname).toEqual('example.com');
    expect(result.protocol).toEqual('https:');
    expect(result.pathname).toEqual('/logout');
    expect(result.searchParams.get('post_logout_redirect_uri')).toEqual(
      'https://example.com/redirect'
    );
    expect(result.searchParams.get('id_token_hint')).toBeNull();
  });

  it('Logout with id Token ', () => {
    authConfig.setProviderConfiguration({
      endSessionEndpoint: 'https://example.com/logout'
    } as any);
    localUrl.convertToAbsoluteUrl = jasmine
      .createSpy('getLocalUrl')
      .and.returnValue('https://example.com/redirect');

    service.logout('idT');

    const result = new URL(windowMock.location.href);
    expect(result.hostname).toEqual('example.com');
    expect(result.protocol).toEqual('https:');
    expect(result.pathname).toEqual('/logout');
    expect(result.searchParams.get('post_logout_redirect_uri')).toEqual(
      'https://example.com/redirect'
    );
    expect(result.searchParams.get('id_token_hint')).toEqual('idT');
  });

  it('Logout with redirect URI ', () => {
    authConfig.setProviderConfiguration({
      endSessionEndpoint: 'https://example.com/logout'
    } as any);

    service.logout('idT', 'https://example.com/redirect2');

    const result = new URL(windowMock.location.href);
    expect(result.hostname).toEqual('example.com');
    expect(result.protocol).toEqual('https:');
    expect(result.pathname).toEqual('/logout');
    expect(result.searchParams.get('post_logout_redirect_uri')).toEqual(
      'https://example.com/redirect2'
    );
    expect(result.searchParams.get('id_token_hint')).toEqual('idT');
  });
});
