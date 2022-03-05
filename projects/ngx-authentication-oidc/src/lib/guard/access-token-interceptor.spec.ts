import { HttpHandler, HttpHeaders, HttpRequest } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { AuthConfigService } from '../auth-config.service';
import { AuthService } from '../auth.service';
import { OauthConfig } from '../configuration/oauth-config';
import { AccessTokenInterceptor } from './access-token-interceptor';

const config = {
  accessTokenUrlPrefixes: ['https://allowed1.com/a1', 'https://allowed2.com']
};

let authService: AuthService;
let service: AccessTokenInterceptor;
let next: HttpHandler;

function getReq(url: string): HttpRequest<any> {
  const result = {
    url: url,
    headers: new HttpHeaders()
  } as any;
  result.clone = (update: any) => {
    result.headers = update.headers;
    return result;
  };
  return result;
}

describe('AccessTokenInterceptor', () => {
  beforeEach(() => {
    const authConfig = new AuthConfigService(config as OauthConfig);
    authService = jasmine.createSpyObj('authService', ['login', 'isLoggedIn']);
    next = jasmine.createSpyObj('next', ['handle']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: AuthConfigService, useValue: authConfig },
        AccessTokenInterceptor
      ]
    });
    service = TestBed.inject(AccessTokenInterceptor);
  });

  it('Not logged in and matching URl', () => {
    const req = getReq('https://allowed2.com/a1');
    authService.isLoggedIn = jasmine.createSpy('isLoggedIn').and.returnValue(false);
    authService.getAccessToken = jasmine.createSpy('getAccessToken').and.returnValue(undefined);

    service.intercept(req, next);

    expect(next.handle).toHaveBeenCalledTimes(1);
    expect(req.headers.keys()).toEqual([]);
  });

  it('Not logged in and not matching URl', () => {
    const req = getReq('https://not.com/a1');
    authService.isLoggedIn = jasmine.createSpy('isLoggedIn').and.returnValue(false);
    authService.getAccessToken = jasmine.createSpy('getAccessToken').and.returnValue(undefined);

    service.intercept(req, next);

    expect(next.handle).toHaveBeenCalledTimes(1);
    expect(req.headers.keys()).toEqual([]);
  });

  it('Logged in and matching URl', () => {
    const req = getReq('https://allowed2.com/a1');
    authService.isLoggedIn = jasmine.createSpy('isLoggedIn').and.returnValue(true);
    authService.getAccessToken = jasmine.createSpy('getAccessToken').and.returnValue('at');

    service.intercept(req, next);

    expect(next.handle).toHaveBeenCalledTimes(1);
    expect(req.headers.keys()).toEqual(['Authorization']);
    expect(req.headers.get('Authorization')).toEqual('Bearer at');
  });

  it('Logged in and not matching URl', () => {
    const req = getReq('https://not.com/a1');
    authService.isLoggedIn = jasmine.createSpy('isLoggedIn').and.returnValue(true);
    authService.getAccessToken = jasmine.createSpy('getAccessToken').and.returnValue('at');

    service.intercept(req, next);

    expect(next.handle).toHaveBeenCalledTimes(1);
    expect(req.headers.keys()).toEqual([]);
  });

  it('No access token', () => {
    const req = getReq('https://allowed2.com/a1');
    authService.isLoggedIn = jasmine.createSpy('isLoggedIn').and.returnValue(true);
    authService.getAccessToken = jasmine.createSpy('getAccessToken').and.returnValue(undefined);

    service.intercept(req, next);

    expect(next.handle).toHaveBeenCalledTimes(1);
    expect(req.headers.keys()).toEqual([]);
  });
});
