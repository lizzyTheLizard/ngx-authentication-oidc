import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Idle } from '@ng-idle/core';
import { Subject } from 'rxjs';
import { OauthConfig } from '../public-api';
import { AuthConfigService } from './auth-config.service';
import { AuthService } from './auth.service';
import { WindowToken } from './authentication-module.tokens';
import { LoginResult } from './login-result';
import { OidcRefresh } from './oidc/oidc-refresh';
import { OidcSessionManagement } from './oidc/oidc-session-management';
import { OidcSilentLogin } from './oidc/oidc-silent-login';
import { SessionService } from './session.service';

const config = {};

const oldResult: LoginResult = {
  isLoggedIn: true,
  accessToken: 'at',
  expiresAt: new Date(),
  idToken: 'id',
  userInfo: { sub: '123' },
  sessionState: '123-123',
  refreshToken: 'rt'
};

const successLogin: LoginResult = {
  isLoggedIn: true,
  accessToken: 'at',
  expiresAt: new Date(),
  idToken: 'id',
  userInfo: { sub: '123' }
};

let service: SessionService;
let sessionManagement: OidcSessionManagement;
let silentLogin: OidcSilentLogin;
let refresh: OidcRefresh;
let authService: AuthService;
let idle: Idle;
let isLoggedInSub: Subject<boolean>;
let window: Window;

describe('SessionService', () => {
  beforeEach(() => {
    const configService = new AuthConfigService(config as OauthConfig);
    silentLogin = jasmine.createSpyObj('OidcSilentLogin', ['login']);
    refresh = jasmine.createSpyObj('OidcRefresh', ['tokenRefresh']);
    window = jasmine.createSpyObj('Window', ['setInterval', 'clearInterval']);
    idle = jasmine.createSpyObj('Idle', [
      'setIdleName',
      'setIdle',
      'setTimeout',
      'setInterrupts',
      'watch',
      'stop'
    ]);
    (idle as any).onTimeout = new Subject<number>();
    (idle as any).onTimeoutWarning = new Subject<number>();
    (idle as any).onIdleEnd = new Subject<any>();
    (idle as any).onIdleStart = new Subject<any>();
    sessionManagement = jasmine.createSpyObj('OidcSessionManagement', ['stopWatching']);
    sessionManagement.watchSession = jasmine
      .createSpy('watchSession')
      .and.returnValue(new Subject());
    authService = jasmine.createSpyObj('AuthService', ['getExpiresAt', 'logout', 'setLoginResult']);
    isLoggedInSub = new Subject<boolean>();
    (authService as any).isLoggedIn$ = isLoggedInSub;
    authService.getLoginResult = jasmine.createSpy('getLoginResult').and.returnValue(oldResult);

    TestBed.configureTestingModule({
      imports: [],
      providers: [
        { provide: AuthConfigService, useValue: configService },
        { provide: AuthService, useValue: authService },
        { provide: WindowToken, useValue: window },
        { provide: OidcSilentLogin, useValue: silentLogin },
        { provide: OidcSessionManagement, useValue: sessionManagement },
        { provide: Idle, useValue: idle },
        { provide: OidcRefresh, useValue: refresh },
        SessionService
      ]
    });
    service = TestBed.inject(SessionService);
  });

  it('Idle Timeout Start/Stop', () => {
    isLoggedInSub.next(true);
    expect(idle.watch).toHaveBeenCalledTimes(1);
    isLoggedInSub.next(false);
    expect(idle.stop).toHaveBeenCalledTimes(1);
    isLoggedInSub.next(false);
    expect(idle.stop).toHaveBeenCalledTimes(1);
  });

  it('Idle Timeout Detect Timeout Warning', () => {
    const warning = jasmine.createSpy('timeout');
    service.secondsUntilTimeout$.subscribe((x) => warning(x));

    isLoggedInSub.next(true);
    idle.onTimeoutWarning.next(10);

    expect(warning).toHaveBeenCalledTimes(1);
    expect(warning).toHaveBeenCalledWith(10);
  });

  it('Idle Timeout Detect Timeout', () => {
    isLoggedInSub.next(true);
    idle.onTimeout.next(2);

    expect(authService.logout).toHaveBeenCalledTimes(1);
  });

  it('Token Update Start/Stop', () => {
    isLoggedInSub.next(true);
    expect(window.setInterval).toHaveBeenCalledTimes(1);
    isLoggedInSub.next(false);
    expect(window.clearInterval).toHaveBeenCalledTimes(1);
    isLoggedInSub.next(false);
    expect(window.clearInterval).toHaveBeenCalledTimes(1);
  });

  it('Token Update', fakeAsync(() => {
    let func: Function = () => {};
    window.setInterval = jasmine.createSpy('setInterval').and.callFake((f: Function) => (func = f));
    refresh.tokenRefresh = jasmine
      .createSpy('tokenRefresh')
      .and.returnValue(Promise.resolve(successLogin));

    isLoggedInSub.next(true);
    func();
    tick(1000);

    expect(refresh.tokenRefresh).toHaveBeenCalledTimes(1);
    expect(refresh.tokenRefresh).toHaveBeenCalledWith(oldResult);
    expect(authService.setLoginResult).toHaveBeenCalledTimes(1);
    expect(authService.setLoginResult).toHaveBeenCalledWith(successLogin);
  }));

  it('Force Token Update', async () => {
    silentLogin.login = jasmine
      .createSpy('silentLogin')
      .and.returnValue(Promise.resolve(successLogin));

    await service.updateToken(false);

    expect(silentLogin.login).toHaveBeenCalledTimes(1);
    expect(authService.setLoginResult).toHaveBeenCalledTimes(1);
    expect(authService.setLoginResult).toHaveBeenCalledWith(successLogin);
  });

  it('Force Token Update with Refresh Token', async () => {
    refresh.tokenRefresh = jasmine
      .createSpy('tokenRefresh')
      .and.returnValue(Promise.resolve(successLogin));

    await service.updateToken(true);

    expect(refresh.tokenRefresh).toHaveBeenCalledTimes(1);
    expect(refresh.tokenRefresh).toHaveBeenCalledWith(oldResult);
    expect(authService.setLoginResult).toHaveBeenCalledTimes(1);
    expect(authService.setLoginResult).toHaveBeenCalledWith(successLogin);
  });
});
