import { AuthService, SessionHandlerToken } from './auth.service';
import { TokenStore } from './token-store/token-store';
import { LoginResult } from './login-result';
import { Initializer, LoginOptions, OauthConfig } from '../public-api';
import { TestBed } from '@angular/core/testing';
import { AuthenticationModule } from './authentication-module';
import { RouterTestingModule } from '@angular/router/testing';
import { OidcDiscovery } from './oidc/oidc-discovery';
import { OidcLogin } from './oidc/oidc-login';
import { OidcSilentLogin } from './oidc/oidc-silent-login';
import { OidcLogout } from './oidc/oidc-logout';
import { Router } from '@angular/router';
import { OidcSessionManagement } from './oidc/oidc-session-management';
import { firstValueFrom, Subject } from 'rxjs';
import { LoggerFactoryToken } from './logger/logger';
import { InitializerToken } from './initializer/initializer';

const loginResult: LoginResult = {isLoggedIn: true, idToken: 'at', accessToken: 'id', userInfo: {sub: 'name'}};
const failedLoginResult: LoginResult = {isLoggedIn: false};
const config: OauthConfig = {
  errorUrl: 'auth/error',
  logoutUrl: 'auth/logout',
  client: {clientId: "id", redirectUri: "url"},
  provider: {authEndpoint: "auth", tokenEndpoint: "token", issuer: "iss", publicKeys: []},
  silentLoginEnabled: true      
};

let service: AuthService;
let router: Router;
let initializer: jasmine.Spy<Initializer>;
let discovery: jasmine.Spy<() => Promise<void>>;
let login: jasmine.Spy<(options: LoginOptions) => Promise<LoginResult>>;
let silentLogin: jasmine.Spy<(options: LoginOptions) => Promise<LoginResult>>;
let oidcSessionManagementChange = new Subject<void>();

describe('AuthService', () => {
  beforeEach(() => {  
    initializer = jasmine.createSpy('initializer');
    let oidcLogin: OidcLogin= jasmine.createSpyObj('oidcLogin', [ 'login']);
    login = oidcLogin.login as jasmine.Spy<(options: LoginOptions) => Promise<LoginResult>>;
    let oidcSilentLogin: OidcSilentLogin = jasmine.createSpyObj('oidcSilentLogin', [ 'login']);
    silentLogin = oidcSilentLogin.login as jasmine.Spy<(options: LoginOptions) => Promise<LoginResult>>;
    let oidcDiscovery: OidcDiscovery = jasmine.createSpyObj('oidcDiscovery', [ 'discover']);
    discovery = oidcDiscovery.discover as jasmine.Spy<() => Promise<void>>;
    let oidcLogout: OidcLogout = jasmine.createSpyObj('oidcLogout', [ 'logout']);
    let sessionHandler = jasmine.createSpyObj('sessionHandler', ["startWatching", 'stopWatching']);
    oidcSessionManagementChange = new Subject();
    let oidcSessionManagement = jasmine.createSpyObj('oidcSessionManagement', ["startWatching", 'stopWatching']);
    oidcSessionManagement.sessionChanged$ = oidcSessionManagementChange;
    TestBed.configureTestingModule({
      imports: [
        AuthenticationModule.forRoot(config as OauthConfig),
        RouterTestingModule,
      ],
      providers:[
        { provide: LoggerFactoryToken, useValue: () => console },
        { provide: InitializerToken, useValue: initializer },
        { provide: SessionHandlerToken, useValue: sessionHandler },
        { provide: OidcLogin, useValue: oidcLogin},
        { provide: OidcSilentLogin, useValue: oidcSilentLogin},
        { provide: OidcDiscovery, useValue: oidcDiscovery},
        { provide: OidcLogout, useValue: oidcLogout},
        { provide: OidcSessionManagement, useValue: oidcSessionManagement},
      ],
    });
    service = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    localStorage.clear();
    spyOn<TokenStore, any>(localStorage, 'setItem').and.callThrough();
    spyOn<TokenStore, any>(localStorage, 'removeItem').and.callThrough();
  });

  it("Discovery Failed", async () => {
    const navigateSpy = spyOn(router, 'navigateByUrl');
    discovery.and.returnValue(Promise.reject("Cannot perform initialization"));
    initializer.and.returnValue(Promise.resolve(failedLoginResult));
    
    service.initialize();
    await service.initialSetupFinished$;
    
    expect(navigateSpy).toHaveBeenCalledWith('auth/error');
    expect(service.getAccessToken()).toEqual(undefined);
    expect(service.getIdToken()).toEqual(undefined);
    expect(service.getUserInfo()).toEqual(undefined);
    expect(service.isLoggedIn()).toEqual(false);
  });

  it("Initialization No Login", async () => {
    discovery.and.returnValue(Promise.resolve());
    initializer.and.returnValue(Promise.resolve(failedLoginResult));

    service.initialize();
    await service.initialSetupFinished$;

    expect(service.getAccessToken()).toEqual(undefined);
    expect(service.getIdToken()).toEqual(undefined);
    expect(service.getUserInfo()).toEqual(undefined);
    expect(service.isLoggedIn()).toEqual(false);
  });

  it("Initialization Login", async () => {
    discovery.and.returnValue(Promise.resolve());
    initializer.and.returnValue(Promise.resolve(loginResult));

    service.initialize();
    await service.initialSetupFinished$;

    expect(service.getAccessToken()).toEqual(loginResult.accessToken);
    expect(service.getIdToken()).toEqual(loginResult.idToken);
    expect(service.getUserInfo()).toEqual(loginResult.userInfo);
    expect(service.isLoggedIn()).toEqual(true);
  });

  it("Initialization Failed", async () => {
    const navigateSpy = spyOn(router, 'navigateByUrl');
    discovery.and.returnValue(Promise.resolve());
    initializer.and.returnValue(Promise.reject("Cannot perform initialization"));
    
    service.initialize();
    await service.initialSetupFinished$;
    
    expect(navigateSpy).toHaveBeenCalledWith('auth/error');
    expect(service.getAccessToken()).toEqual(undefined);
    expect(service.getIdToken()).toEqual(undefined);
    expect(service.getUserInfo()).toEqual(undefined);
    expect(service.isLoggedIn()).toEqual(false);
  });

  it("Login", async () => {
    login.and.returnValue(Promise.resolve(loginResult))
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

  it("Login Failed", async () => {
    login.and.returnValue(Promise.resolve(failedLoginResult))
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

  it("Silent Login", async () => {
    silentLogin.and.returnValue(Promise.resolve(loginResult))
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

  it("Silent Login Failed", async () => {
    silentLogin.and.returnValue(Promise.resolve(failedLoginResult))
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

  it("Logout", async () => {
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

  it("Session Changed, SilentLogin Failed", async () => {
    silentLogin.and.returnValue(Promise.resolve(failedLoginResult))
    discovery.and.returnValue(Promise.resolve());
    initializer.and.returnValue(Promise.resolve(loginResult));

    service.initialize();
    await service.initialSetupFinished$;
    const userInfoChangedPromise = firstValueFrom(service.userInfo$);

    oidcSessionManagementChange.next();

    await userInfoChangedPromise;

    expect(service.getAccessToken()).toEqual(undefined);
    expect(service.getIdToken()).toEqual(undefined);
    expect(service.getUserInfo()).toEqual(undefined);
    expect(service.isLoggedIn()).toEqual(false);
  });


  it("Session Changed, SilentLogin returns different user", async () => {
    silentLogin.and.returnValue(Promise.resolve({...loginResult, userInfo: {sub: 'name2'}}))
    discovery.and.returnValue(Promise.resolve());
    initializer.and.returnValue(Promise.resolve(loginResult));

    service.initialize();
    await service.initialSetupFinished$;
    const userInfoChangedPromise = firstValueFrom(service.userInfo$);
    oidcSessionManagementChange.next();
    await userInfoChangedPromise;

    expect(service.getAccessToken()).toEqual(undefined);
    expect(service.getIdToken()).toEqual(undefined);
    expect(service.getUserInfo()).toEqual(undefined);
    expect(service.isLoggedIn()).toEqual(false);
  });

  it("Session Changed, SilentLogin returns same user", async () => {
    discovery.and.returnValue(Promise.resolve());
    initializer.and.returnValue(Promise.resolve(loginResult));
    silentLogin.and.returnValue(Promise.resolve(loginResult));

    service.initialize();
    await service.initialSetupFinished$;
    const userInfoChangedPromise = firstValueFrom(service.userInfo$);
    oidcSessionManagementChange.next();
    await userInfoChangedPromise;

    expect(service.getAccessToken()).toEqual(loginResult.accessToken);
    expect(service.getIdToken()).toEqual(loginResult.idToken);
    expect(service.getUserInfo()).toEqual(loginResult.userInfo);
    expect(service.isLoggedIn()).toEqual(true);
  });


});
