/* global localStorage*/
import { AuthService } from './auth.service';
import { LoginResult, UserInfo } from './login-result';
import { TestBed } from '@angular/core/testing';
import { AuthenticationModule } from './authentication-module';
import { RouterTestingModule } from '@angular/router/testing';
import { OidcDiscovery } from './oidc/oidc-discovery';
import { OidcLogin } from './oidc/oidc-login';
import { OidcSilentLogin } from './oidc/oidc-silent-login';
import { OidcLogout } from './oidc/oidc-logout';
import { Router } from '@angular/router';
import { OidcSessionManagement } from './oidc/oidc-session-management';
import { Subject } from 'rxjs';
import { WindowToken } from './authentication-module.tokens';
import { LoginOptions } from './configuration/login-options';
import { Initializer, OauthConfig } from './configuration/oauth-config';
import { redirect, singleLogout } from './configuration/default-actions';
import { OidcCodeResponse } from './oidc/oidc-code-response';
import { OidcTokenResponse } from './oidc/oidc-token-response';

const config: OauthConfig = {
  initializationErrorAction: redirect('/auth/error'),
  logoutAction: redirect('/auth/logout'),
  clientId: 'id',
  redirectUri: 'https://example.com/rd',
  provider: {
    authEndpoint: 'auth',
    tokenEndpoint: 'token',
    issuer: 'iss',
    publicKeys: []
  }
};

const loginResult: LoginResult = {
  isLoggedIn: true,
  idToken: 'at',
  accessToken: 'id',
  userInfo: { sub: 'name' }
};

const failedLoginResult: LoginResult = { isLoggedIn: false };

let service: AuthService;
let router: Router;
let initializer: jasmine.Spy<Initializer>;
let logout: jasmine.Spy<() => Promise<void>>;
let discovery: jasmine.Spy<() => Promise<void>>;
let login: jasmine.Spy<(options: LoginOptions) => Promise<LoginResult>>;
let silentLogin: jasmine.Spy<(options: LoginOptions) => Promise<LoginResult>>;
let oidcSessionManagementChange: Subject<void>;
let windowMock: Window;
let codeResponse: jasmine.Spy<(params: Response, redirect: URL) => Promise<LoginResult>>;
let tokenResponse: jasmine.Spy<(params: Response) => Promise<LoginResult>>;
let fetchAdditionalUserInfo: jasmine.Spy<(params: UserInfo) => Promise<UserInfo>>;

describe('AuthService', () => {
  beforeEach(() => {
    initializer = jasmine.createSpy('initializer');
    config.initializer = initializer;
    fetchAdditionalUserInfo = jasmine
      .createSpy('fetchAdditionalUserInfo')
      .and.callFake((ui) => Promise.resolve(ui));
    config.fetchAdditionalUserInfo = fetchAdditionalUserInfo;

    login = jasmine.createSpy('login');
    silentLogin = jasmine.createSpy('silentLogin');
    discovery = jasmine.createSpy('discovery');
    logout = jasmine.createSpy('logout').and.returnValue(Promise.resolve());
    codeResponse = jasmine.createSpy('discovery');
    tokenResponse = jasmine.createSpy('discovery');

    oidcSessionManagementChange = new Subject<void>();

    windowMock = {
      setInterval: jasmine.createSpy('setInterval'),
      clearInterval: jasmine.createSpy('clearInterval '),
      location: { href: 'https://example.com/rd', origin: 'http://localhost' }
    } as any;
    const oidcSessionManagement = {
      changed$: oidcSessionManagementChange,
      startWatching: () => {},
      stopWatching: () => {}
    };

    const oidcLogin = {
      login: login,
      getRedirectUrl: () => new URL('https://example.com/rd')
    };

    TestBed.configureTestingModule({
      imports: [
        AuthenticationModule.forRoot(config as OauthConfig),
        RouterTestingModule.withRoutes([
          { path: 'auth/error', redirectTo: '/' },
          { path: 'auth/logout', redirectTo: '/' }
        ])
      ],
      providers: [
        { provide: WindowToken, useFactory: () => windowMock },
        { provide: OidcLogin, useValue: oidcLogin },
        { provide: OidcSilentLogin, useValue: { login: silentLogin } },
        { provide: OidcDiscovery, useValue: { discover: discovery } },
        { provide: OidcLogout, useValue: { logout: logout } },
        { provide: OidcCodeResponse, useValue: { response: codeResponse } },
        { provide: OidcTokenResponse, useValue: { response: tokenResponse } },
        { provide: OidcSessionManagement, useValue: oidcSessionManagement }
      ]
    });
    service = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    localStorage.clear();
    spyOn<Storage, any>(localStorage, 'setItem').and.callThrough();
    spyOn<Storage, any>(localStorage, 'removeItem').and.callThrough();
  });

  it('Discovery Failed', async () => {
    const navigateSpy = spyOn(router, 'navigateByUrl');
    discovery.and.returnValue(Promise.reject('Cannot perform initialization'));
    initializer.and.returnValue(Promise.resolve(failedLoginResult));

    service.initialize();
    await service.initialSetupFinished$;

    expect(navigateSpy).toHaveBeenCalledWith('/auth/error');
    expect(service.getLoginResult()).toEqual({ isLoggedIn: false });
  });

  it('Initialization No Login', async () => {
    discovery.and.returnValue(Promise.resolve());
    initializer.and.returnValue(Promise.resolve(failedLoginResult));

    service.initialize();
    await service.initialSetupFinished$;

    expect(service.getLoginResult()).toEqual({ isLoggedIn: false });
  });

  it('Initialization Login', async () => {
    discovery.and.returnValue(Promise.resolve());
    initializer.and.returnValue(Promise.resolve(loginResult));

    service.initialize();
    await service.initialSetupFinished$;

    expect(service.getLoginResult()).toEqual(loginResult);
  });

  it('Initialization No Response', async () => {
    discovery.and.returnValue(Promise.resolve());
    windowMock.location.href = 'http://else.com/nothing';
    initializer.and.callFake((input) => input.handleResponse());

    service.initialize();
    await service.initialSetupFinished$;

    expect(service.getLoginResult()).toEqual({ isLoggedIn: false });
  });

  it('Initialization Code Response', async () => {
    discovery.and.returnValue(Promise.resolve());
    windowMock.location.href = 'https://example.com/rd?code=123';
    initializer.and.callFake((input) => input.handleResponse());
    codeResponse.and.returnValue(Promise.resolve(loginResult));

    service.initialize();
    await service.initialSetupFinished$;

    expect(service.getLoginResult()).toEqual(loginResult);
  });

  it('Initialization Token Response', async () => {
    discovery.and.returnValue(Promise.resolve());
    windowMock.location.href = 'https://example.com/rd?id_token=123';
    initializer.and.callFake((input) => input.handleResponse());
    tokenResponse.and.returnValue(Promise.resolve(loginResult));

    service.initialize();
    await service.initialSetupFinished$;

    expect(service.getLoginResult()).toEqual(loginResult);
  });

  it('Initialization Error Response', async () => {
    discovery.and.returnValue(Promise.resolve());
    windowMock.location.href = 'https://example.com/rd?error=error';
    initializer.and.callFake((input) => input.handleResponse());
    tokenResponse.and.returnValue(Promise.resolve(loginResult));

    service.initialize();
    await service.initialSetupFinished$;

    expect(service.getLoginResult()).toEqual({ isLoggedIn: false });
  });

  it('Initialization Failed', async () => {
    const navigateSpy = spyOn(router, 'navigateByUrl');
    discovery.and.returnValue(Promise.resolve());
    initializer.and.returnValue(Promise.reject('Cannot perform initialization'));

    service.initialize();
    await service.initialSetupFinished$;

    expect(navigateSpy).toHaveBeenCalledWith('/auth/error');
    expect(service.getLoginResult()).toEqual({ isLoggedIn: false });
  });

  it('Login', async () => {
    login.and.returnValue(Promise.resolve(loginResult));
    discovery.and.returnValue(Promise.resolve());
    initializer.and.returnValue(Promise.resolve(failedLoginResult));
    await service.initialSetupFinished$;

    await service.login();

    expect(service.getLoginResult()).toEqual(loginResult);
  });

  it('Login Failed', async () => {
    login.and.returnValue(Promise.resolve(failedLoginResult));
    discovery.and.returnValue(Promise.resolve());
    initializer.and.returnValue(Promise.resolve(failedLoginResult));
    await service.initialSetupFinished$;

    await service.login();

    expect(service.getLoginResult()).toEqual({ isLoggedIn: false });
  });

  it('Silent Login', async () => {
    silentLogin.and.returnValue(Promise.resolve(loginResult));
    discovery.and.returnValue(Promise.resolve());
    initializer.and.returnValue(Promise.resolve(failedLoginResult));
    await service.initialSetupFinished$;

    await service.silentLogin();

    expect(service.getLoginResult()).toEqual(loginResult);
  });

  it('Silent Login Failed', async () => {
    silentLogin.and.returnValue(Promise.resolve(failedLoginResult));
    discovery.and.returnValue(Promise.resolve());
    initializer.and.returnValue(Promise.resolve(failedLoginResult));
    await service.initialSetupFinished$;

    await service.silentLogin();

    expect(service.getLoginResult()).toEqual({ isLoggedIn: false });
  });

  it('Logout', async () => {
    const navigateSpy = spyOn(router, 'navigateByUrl');
    discovery.and.returnValue(Promise.resolve());
    initializer.and.returnValue(Promise.resolve(loginResult));
    await service.initialSetupFinished$;

    await service.logout();

    expect(navigateSpy).toHaveBeenCalledWith('/auth/logout');
    expect(service.getLoginResult()).toEqual({ isLoggedIn: false });
  });

  it('Logout with custom action', async () => {
    discovery.and.returnValue(Promise.resolve());
    initializer.and.returnValue(Promise.resolve(loginResult));
    await service.initialSetupFinished$;
    const logoutAction = jasmine.createSpy('logoutAction').and.returnValue(Promise.resolve());

    await service.logout(logoutAction);

    expect(logoutAction).toHaveBeenCalledTimes(1);
    expect(service.getLoginResult()).toEqual({ isLoggedIn: false });
  });

  it('Logout with single logout action', async () => {
    discovery.and.returnValue(Promise.resolve());
    initializer.and.returnValue(Promise.resolve(loginResult));
    await service.initialSetupFinished$;

    await service.logout(singleLogout('redirect'));

    expect(logout).toHaveBeenCalledTimes(1);
    expect(service.getLoginResult()).toEqual({ isLoggedIn: false });
  });

  it('Properties', async () => {
    login.and.returnValue(Promise.resolve(loginResult));
    discovery.and.returnValue(Promise.resolve());
    initializer.and.returnValue(Promise.resolve(failedLoginResult));
    const isLoggedInChanged = jasmine.createSpy('isLoggedInChanged');
    const isUserInfoChanged = jasmine.createSpy('isUserInfoChanged');
    service.isLoggedIn$.subscribe((s) => isLoggedInChanged(s));
    service.userInfo$.subscribe((s) => isUserInfoChanged(s));
    await service.initialSetupFinished$;

    await service.login();

    expect(service.getAccessToken()).toEqual(loginResult.accessToken);
    expect(service.getExpiresAt()).toEqual(loginResult.expiresAt);
    expect(service.getIdToken()).toEqual(loginResult.idToken);
    expect(service.getUserInfo()).toEqual(loginResult.userInfo);
    expect(service.isLoggedIn()).toEqual(true);
    expect(isLoggedInChanged).toHaveBeenCalledTimes(3);
    expect(isLoggedInChanged).toHaveBeenCalledWith(true);
    expect(isUserInfoChanged).toHaveBeenCalledTimes(3);
    expect(isUserInfoChanged).toHaveBeenCalledWith(loginResult.userInfo);
    isLoggedInChanged.calls.reset();
    isUserInfoChanged.calls.reset();

    await service.logout();

    expect(service.getAccessToken()).toBeUndefined();
    expect(service.getExpiresAt()).toBeUndefined();
    expect(service.getIdToken()).toBeUndefined();
    expect(service.getUserInfo()).toBeUndefined();
    expect(service.isLoggedIn()).toEqual(false);
    expect(isLoggedInChanged).toHaveBeenCalledTimes(1);
    expect(isLoggedInChanged).toHaveBeenCalledWith(false);
    expect(isUserInfoChanged).toHaveBeenCalledTimes(1);
    expect(isUserInfoChanged).toHaveBeenCalledWith(undefined);
  });

  it('Fetch additional user info', async () => {
    login.and.returnValue(Promise.resolve(loginResult));
    discovery.and.returnValue(Promise.resolve());
    initializer.and.returnValue(Promise.resolve(failedLoginResult));
    const fakeUserInfo = { sub: 'test222CC' };
    fetchAdditionalUserInfo.and.callFake(() => Promise.resolve(fakeUserInfo));
    await service.initialSetupFinished$;

    await service.login();

    expect(service.getUserInfo()).toEqual(fakeUserInfo);
    expect(service.getLoginResult()).toEqual({ ...loginResult, userInfo: fakeUserInfo });
    expect(fetchAdditionalUserInfo).toHaveBeenCalledTimes(1);
    expect(fetchAdditionalUserInfo).toHaveBeenCalledWith(loginResult.userInfo!);
  });
});
