import { AuthService } from './auth.service';
import { TokenStore } from './token-store/token-store';
import { TokenStoreWrapper } from './token-store/token-store-wrapper';
import { Router } from '@angular/router';
import { OidcService } from './oidc/oidc.service';
import { LoginResult, UserInfo } from './oidc/login-result';

const loginResult: LoginResult = {isLoggedIn: true, idToken: 'at', accessToken: 'id', userInfo: {name: 'name'}};
const failedLoginResult: LoginResult = {isLoggedIn: false};

let config: any;
let oidcService: OidcService;
let service: AuthService;
let router: Router;

describe('AuthService', () => {
  beforeEach(() => {
    config = {
      errorUrl: 'auth/error',
      logoutUrl: 'auth/logout',
      sessionHandler: jasmine.createSpyObj('sessionHandler', ["startWatching", 'stopWatching']),
      tokenStore: new TokenStoreWrapper(localStorage),
      initializer: jasmine.createSpy('initializer').and.returnValue(Promise.resolve({isLoggedIn: false})),
      loggerFactory: () => console,
      client: {clientId: "id", redirectUri: "url"},
      provider: {authEndpoint: "auth", tokenEndpoint: "token"},
      isSilentLoginEnabled: true      
    };
    oidcService = jasmine.createSpyObj('oidcService', ["checkResponse", "login", "silentLogin", "logout"]);
    oidcService.initialize = jasmine.createSpy().and.returnValue(Promise.resolve());
    spyOn<TokenStore, any>(localStorage, 'setItem').and.callThrough();
    spyOn<TokenStore, any>(localStorage, 'removeItem').and.callThrough();
    localStorage.clear();
    router = jasmine.createSpyObj('router', ["navigateByUrl"]);
    service = new AuthService(oidcService, config, router);
  });

  it("LoginHandler Initialization Failed", async () => {
    oidcService.initialize = jasmine.createSpy().and.returnValue(Promise.reject());
    service.initialize();
    await service.initialSetupFinished$;

    expect(oidcService.initialize).toHaveBeenCalledTimes(1);
    expect(config.initializer).toHaveBeenCalledTimes(0);
    expect(router.navigateByUrl).toHaveBeenCalledTimes(1);
    expect(router.navigateByUrl).toHaveBeenCalledWith('auth/error');
  });

  it("Initializer Failed", async () => {
    config.initializer = jasmine.createSpy().and.returnValue(Promise.reject());
    service.initialize();
    await service.initialSetupFinished$;

    expect(oidcService.initialize).toHaveBeenCalledTimes(1);
    expect(config.initializer).toHaveBeenCalledTimes(1);
    expect(router.navigateByUrl).toHaveBeenCalledTimes(1);
    expect(router.navigateByUrl).toHaveBeenCalledWith('auth/error');
  });

  it("Properties before initialization", async () => {
    oidcService.initialize = jasmine.createSpy().and.returnValue(new Promise(res => setTimeout(() => res({}), 1000)));
    service.initialize();
    
    let isLoggedIn: boolean | undefined;
    let userInfo: UserInfo | undefined;
    service.isLoggedIn$.subscribe(x => isLoggedIn = x);
    service.userInfo$.subscribe(x => userInfo = x);

    expect(service.isLoggedIn()).toBeFalse();
    expect(service.getUserInfo()).toBeUndefined();
    expect(service.getIdToken()).toBeUndefined();
    expect(service.getAccessToken()).toBeUndefined();
    expect(isLoggedIn).toBeUndefined();
    expect(userInfo).toBeUndefined();
  });

  it("Properties after initialization", async () => {
    config.initializer = jasmine.createSpy().and.returnValue(Promise.resolve(loginResult));
    service.initialize();

    let isLoggedIn: boolean | undefined;
    let userInfo: UserInfo | undefined;
    service.isLoggedIn$.subscribe(x => isLoggedIn = x);
    service.userInfo$.subscribe(x => userInfo = x);
    await service.initialSetupFinished$;

    expect(service.isLoggedIn()).toBeTrue();
    expect(service.getUserInfo()).toEqual(loginResult.userInfo);
    expect(service.getIdToken()).toEqual(loginResult.idToken);
    expect(service.getAccessToken()).toEqual(loginResult.accessToken);
    expect(isLoggedIn).toBeTrue
    expect(userInfo).toEqual(loginResult.userInfo);
  });
  
  it("Login", async () => {
    oidcService.login = jasmine.createSpy().and.returnValue(Promise.resolve(loginResult));
    service.initialize();

    let isLoggedIn: boolean | undefined;
    let userInfo: UserInfo | undefined;
    service.isLoggedIn$.subscribe(x => isLoggedIn = x);
    service.userInfo$.subscribe(x => userInfo = x);
    await service.initialSetupFinished$;
    await service.login();
    
    expect(service.isLoggedIn()).toBeTrue();
    expect(service.getUserInfo()).toEqual(loginResult.userInfo);
    expect(service.getIdToken()).toEqual(loginResult.idToken);
    expect(service.getAccessToken()).toEqual(loginResult.accessToken);
    expect(isLoggedIn).toBeTrue
    expect(userInfo).toEqual(loginResult.userInfo);
    expect(oidcService.login).toHaveBeenCalledTimes(1);
    expect(oidcService.login).toHaveBeenCalledWith({finalUrl: undefined});
    expect(config.sessionHandler!.startWatching).toHaveBeenCalledTimes(1);
    expect(localStorage.setItem).toHaveBeenCalledTimes(4);
    expect(localStorage.setItem).toHaveBeenCalledWith('auth.idToken', loginResult.idToken!);    
    expect(localStorage.setItem).toHaveBeenCalledWith('auth.accessToken', loginResult.accessToken!);    
    expect(localStorage.setItem).toHaveBeenCalledWith('auth.userInfo', JSON.stringify(loginResult.userInfo));    
    expect(localStorage.setItem).toHaveBeenCalledWith('auth.isLoggedIn', JSON.stringify(loginResult.isLoggedIn));
  });

  it("Silent Login", async () => {
    oidcService.silentLogin = jasmine.createSpy().and.returnValue(Promise.resolve(loginResult));
    service.initialize();

    let isLoggedIn: boolean | undefined;
    let userInfo: UserInfo | undefined;
    service.isLoggedIn$.subscribe(x => isLoggedIn = x);
    service.userInfo$.subscribe(x => userInfo = x);
    await service.initialSetupFinished$;
    await service.silentLogin();
    
    expect(service.isLoggedIn()).toBeTrue();
    expect(service.getUserInfo()).toEqual(loginResult.userInfo);
    expect(service.getIdToken()).toEqual(loginResult.idToken);
    expect(service.getAccessToken()).toEqual(loginResult.accessToken);
    expect(isLoggedIn).toBeTrue
    expect(userInfo).toEqual(loginResult.userInfo);
    expect(oidcService.silentLogin).toHaveBeenCalledTimes(1);
    expect(oidcService.silentLogin).toHaveBeenCalledWith({});
    expect(config.sessionHandler!.startWatching).toHaveBeenCalledTimes(1);
    expect(localStorage.setItem).toHaveBeenCalledTimes(4);
    expect(localStorage.setItem).toHaveBeenCalledWith('auth.idToken', loginResult.idToken!);    
    expect(localStorage.setItem).toHaveBeenCalledWith('auth.accessToken', loginResult.accessToken!);    
    expect(localStorage.setItem).toHaveBeenCalledWith('auth.userInfo', JSON.stringify(loginResult.userInfo));    
    expect(localStorage.setItem).toHaveBeenCalledWith('auth.isLoggedIn', JSON.stringify(loginResult.isLoggedIn));
  });

  it("Login Failed", async () => {
    oidcService.login = jasmine.createSpy().and.returnValue(Promise.resolve(failedLoginResult));
    service.initialize();

    let isLoggedIn: boolean | undefined;
    let userInfo: UserInfo | undefined;
    service.isLoggedIn$.subscribe(x => isLoggedIn = x);
    service.userInfo$.subscribe(x => userInfo = x);
    await service.initialSetupFinished$;
    await service.login();
    
    expect(service.isLoggedIn()).toBeFalse();
    expect(service.getUserInfo()).toBeUndefined()
    expect(service.getIdToken()).toBeUndefined();
    expect(service.getAccessToken()).toBeUndefined();
    expect(isLoggedIn).toBeFalse
    expect(userInfo).toBeUndefined();
    expect(oidcService.login).toHaveBeenCalledTimes(1);
    expect(oidcService.login).toHaveBeenCalledWith({finalUrl: undefined});
    expect(config.sessionHandler!.startWatching).toHaveBeenCalledTimes(0);
    expect(localStorage.setItem).toHaveBeenCalledTimes(0);    
  });  

  it("Logout", async () => {
    config.initializer = jasmine.createSpy().and.returnValue(Promise.resolve(loginResult));
    service.initialize();

    await service.initialSetupFinished$;

    let isLoggedIn: boolean | undefined;
    let userInfo: UserInfo | undefined;
    service.isLoggedIn$.subscribe(x => isLoggedIn = x);
    service.userInfo$.subscribe(x => userInfo = x);
    (localStorage.setItem as any).calls.reset();    
    (localStorage.removeItem as any).calls.reset();    
    await service.logout();

    expect(service.isLoggedIn()).toBeFalse();
    expect(service.getUserInfo()).toBeUndefined();
    expect(service.getIdToken()).toBeUndefined();
    expect(service.getAccessToken()).toBeUndefined();
    expect(isLoggedIn).toBeFalse();
    expect(userInfo).toBeUndefined();
    expect(oidcService.logout).toHaveBeenCalledTimes(1);
    expect(config.sessionHandler!.stopWatching).toHaveBeenCalledTimes(1);
    expect(localStorage.removeItem).toHaveBeenCalledWith('auth.idToken');    
    expect(localStorage.removeItem).toHaveBeenCalledWith('auth.accessToken');
    expect(localStorage.removeItem).toHaveBeenCalledWith('auth.userInfo');    
    expect(localStorage.removeItem).toHaveBeenCalledWith('auth.isLoggedIn');
    expect(localStorage.setItem).toHaveBeenCalledTimes(0);
  });
});
