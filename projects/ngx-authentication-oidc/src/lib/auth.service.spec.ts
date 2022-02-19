/* global localStorage*/
import { AuthService } from './auth.service';
import { TokenStore } from './configuration/oauth-config';
import { LoginResult } from './helper/login-result';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AuthenticationModule } from './authentication-module';
import { RouterTestingModule } from '@angular/router/testing';
import { OidcDiscovery } from './oidc/oidc-discovery';
import { OidcLogin } from './oidc/oidc-login';
import { OidcSilentLogin } from './oidc/oidc-silent-login';
import { OidcLogout } from './oidc/oidc-logout';
import { Router } from '@angular/router';
import { OidcSessionManagement } from './oidc/oidc-session-management';
import { Subject, firstValueFrom } from 'rxjs';
import { WindowToken } from './authentication-module.tokens';
import { LoginOptions } from './configuration/login-options';
import { Initializer, OauthConfig } from './configuration/oauth-config';
import { TokenUpdater } from './helper/token-updater';
import { InactiveTimeoutHandler } from './helper/inactive-timeout-handler';

const config: OauthConfig = {
  initializationErrorAction: 'auth/error',
  logoutAction: 'auth/logout',
  client: { clientId: 'id', redirectUri: 'url' },
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
let discovery: jasmine.Spy<() => Promise<void>>;
let login: jasmine.Spy<(options: LoginOptions) => Promise<LoginResult>>;
let silentLogin: jasmine.Spy<(options: LoginOptions) => Promise<LoginResult>>;
let forceCheck: jasmine.Spy<(useRefresh: boolean) => Promise<LoginResult>>;
const oidcSessionManagementChange = new Subject<void>();
const updated = new Subject<LoginResult>();
const sessionHandlerTimeout = new Subject<void>();
const sessionHandlerTimeoutWarning = new Subject<number>();

describe('AuthService', () => {
  beforeEach(() => {
    initializer = jasmine.createSpy('initializer');
    config.initializer = initializer;

    login = jasmine.createSpy('login');
    silentLogin = jasmine.createSpy('silentLogin');
    discovery = jasmine.createSpy('discovery');

    const windowMock = jasmine.createSpyObj('window', [
      'setInterval',
      'clearInterval'
    ]);

    const timeoutHandler = {
      timeout$: sessionHandlerTimeout,
      timeoutWarning$: sessionHandlerTimeoutWarning,
      start: () => {},
      stop: () => {}
    };

    const oidcSessionManagement = {
      changed$: oidcSessionManagementChange,
      startWatching: () => {},
      stopWatching: () => {}
    };

    forceCheck = jasmine.createSpy('forceUpdate');
    const tokenUpdater = {
      updated$: updated,
      startAutoUpdate: () => {},
      stopAutoUpdate: () => {},
      forceCheck: forceCheck
    };

    TestBed.configureTestingModule({
      imports: [
        AuthenticationModule.forRoot(config as OauthConfig),
        RouterTestingModule.withRoutes([
          { path: 'auth/logout', redirectTo: '/' }
        ])
      ],
      providers: [
        { provide: WindowToken, useFactory: () => windowMock },
        { provide: OidcLogin, useValue: { login: login } },
        { provide: InactiveTimeoutHandler, useValue: timeoutHandler },
        { provide: OidcSilentLogin, useValue: { login: silentLogin } },
        { provide: OidcDiscovery, useValue: { discover: discovery } },
        { provide: OidcLogout, useValue: { logout: () => {} } },
        { provide: OidcSessionManagement, useValue: oidcSessionManagement },
        { provide: TokenUpdater, useValue: tokenUpdater }
      ]
    });
    service = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    localStorage.clear();
    spyOn<TokenStore, any>(localStorage, 'setItem').and.callThrough();
    spyOn<TokenStore, any>(localStorage, 'removeItem').and.callThrough();
  });

  it('Discovery Failed', async () => {
    const navigateSpy = spyOn(router, 'navigateByUrl');
    discovery.and.returnValue(Promise.reject('Cannot perform initialization'));
    initializer.and.returnValue(Promise.resolve(failedLoginResult));

    service.initialize();
    await service.initialSetupFinished$;

    expect(navigateSpy).toHaveBeenCalledWith('auth/error');
    expect(service.getAccessToken()).toEqual(undefined);
    expect(service.getIdToken()).toEqual(undefined);
    expect(service.getUserInfo()).toEqual(undefined);
    expect(service.isLoggedIn()).toEqual(false);
  });

  it('Initialization No Login', async () => {
    discovery.and.returnValue(Promise.resolve());
    initializer.and.returnValue(Promise.resolve(failedLoginResult));

    service.initialize();
    await service.initialSetupFinished$;

    expect(service.getAccessToken()).toEqual(undefined);
    expect(service.getIdToken()).toEqual(undefined);
    expect(service.getUserInfo()).toEqual(undefined);
    expect(service.isLoggedIn()).toEqual(false);
  });

  it('Initialization Login', async () => {
    discovery.and.returnValue(Promise.resolve());
    initializer.and.returnValue(Promise.resolve(loginResult));

    service.initialize();
    await service.initialSetupFinished$;

    expect(service.getAccessToken()).toEqual(loginResult.accessToken);
    expect(service.getIdToken()).toEqual(loginResult.idToken);
    expect(service.getUserInfo()).toEqual(loginResult.userInfo);
    expect(service.isLoggedIn()).toEqual(true);
  });

  it('Initialization Failed', async () => {
    const navigateSpy = spyOn(router, 'navigateByUrl');
    discovery.and.returnValue(Promise.resolve());
    initializer.and.returnValue(
      Promise.reject('Cannot perform initialization')
    );

    service.initialize();
    await service.initialSetupFinished$;

    expect(navigateSpy).toHaveBeenCalledWith('auth/error');
    expect(service.getAccessToken()).toEqual(undefined);
    expect(service.getIdToken()).toEqual(undefined);
    expect(service.getUserInfo()).toEqual(undefined);
    expect(service.isLoggedIn()).toEqual(false);
  });

  it('Login', async () => {
    login.and.returnValue(Promise.resolve(loginResult));
    discovery.and.returnValue(Promise.resolve());
    initializer.and.returnValue(Promise.resolve(failedLoginResult));
    service.initialize();
    await service.initialSetupFinished$;

    await service.login();

    expect(service.getAccessToken()).toEqual(loginResult.accessToken);
    expect(service.getIdToken()).toEqual(loginResult.idToken);
    expect(service.getUserInfo()).toEqual(loginResult.userInfo);
    expect(service.isLoggedIn()).toEqual(true);
  });

  it('Login Failed', async () => {
    login.and.returnValue(Promise.resolve(failedLoginResult));
    discovery.and.returnValue(Promise.resolve());
    initializer.and.returnValue(Promise.resolve(failedLoginResult));
    service.initialize();
    await service.initialSetupFinished$;

    await service.login();

    expect(service.getAccessToken()).toEqual(undefined);
    expect(service.getIdToken()).toEqual(undefined);
    expect(service.getUserInfo()).toEqual(undefined);
    expect(service.isLoggedIn()).toEqual(false);
  });

  it('Silent Login', async () => {
    silentLogin.and.returnValue(Promise.resolve(loginResult));
    discovery.and.returnValue(Promise.resolve());
    initializer.and.returnValue(Promise.resolve(failedLoginResult));
    service.initialize();
    await service.initialSetupFinished$;

    await service.silentLogin();

    expect(service.getAccessToken()).toEqual(loginResult.accessToken);
    expect(service.getIdToken()).toEqual(loginResult.idToken);
    expect(service.getUserInfo()).toEqual(loginResult.userInfo);
    expect(service.isLoggedIn()).toEqual(true);
  });

  it('Silent Login Failed', async () => {
    silentLogin.and.returnValue(Promise.resolve(failedLoginResult));
    discovery.and.returnValue(Promise.resolve());
    initializer.and.returnValue(Promise.resolve(failedLoginResult));
    service.initialize();
    await service.initialSetupFinished$;

    await service.silentLogin();

    expect(service.getAccessToken()).toEqual(undefined);
    expect(service.getIdToken()).toEqual(undefined);
    expect(service.getUserInfo()).toEqual(undefined);
    expect(service.isLoggedIn()).toEqual(false);
  });

  it('Logout', async () => {
    const navigateSpy = spyOn(router, 'navigateByUrl');
    discovery.and.returnValue(Promise.resolve());
    initializer.and.returnValue(Promise.resolve(loginResult));
    service.initialize();
    await service.initialSetupFinished$;

    await service.logout();

    expect(navigateSpy).toHaveBeenCalledWith('auth/logout');
    expect(service.getAccessToken()).toEqual(undefined);
    expect(service.getIdToken()).toEqual(undefined);
    expect(service.getUserInfo()).toEqual(undefined);
    expect(service.isLoggedIn()).toEqual(false);
  });

  it('Session Changed', async () => {
    discovery.and.returnValue(Promise.resolve());
    initializer.and.returnValue(Promise.resolve(loginResult));
    forceCheck.calls.reset();

    service.initialize();
    await service.initialSetupFinished$;
    oidcSessionManagementChange.next();

    expect(forceCheck).toHaveBeenCalledTimes(1);
    expect(forceCheck).toHaveBeenCalledWith(false);
  });

  it('Timeout', async () => {
    const navigateSpy = spyOn(router, 'navigateByUrl');
    discovery.and.returnValue(Promise.resolve());
    initializer.and.returnValue(Promise.resolve(loginResult));
    forceCheck.calls.reset();

    service.initialize();
    await service.initialSetupFinished$;
    const userInfoChangedPromise = firstValueFrom(service.userInfo$);
    sessionHandlerTimeout.next();
    await userInfoChangedPromise;

    expect(navigateSpy).toHaveBeenCalledWith('auth/logout');
    expect(service.getAccessToken()).toEqual(undefined);
    expect(service.getIdToken()).toEqual(undefined);
    expect(service.getUserInfo()).toEqual(undefined);
    expect(service.isLoggedIn()).toEqual(false);
  });

  it('Timeout Warning', fakeAsync(async () => {
    discovery.and.returnValue(Promise.resolve());
    initializer.and.returnValue(Promise.resolve(loginResult));

    service.initialize();
    await service.initialSetupFinished$;
    let warnings = 0;
    service.inactiveLogoutWarning$.subscribe(() => warnings++);
    sessionHandlerTimeoutWarning.next(10);
    tick(1000);
    expect(warnings).toEqual(1);
  }));

  it('No Timeout Warning when logged in', fakeAsync(async () => {
    discovery.and.returnValue(Promise.resolve());
    initializer.and.returnValue(Promise.resolve({ isLoggedIn: false }));

    service.initialize();
    await service.initialSetupFinished$;
    let warnings = 0;
    service.inactiveLogoutWarning$.subscribe(() => warnings++);
    sessionHandlerTimeoutWarning.next(10);
    tick(1000);
    expect(warnings).toEqual(0);
  }));
});
