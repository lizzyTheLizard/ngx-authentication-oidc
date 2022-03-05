import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { AuthConfigService } from '../auth-config.service';
import { AuthService } from '../auth.service';
import { OauthConfig } from '../configuration/oauth-config';
import { EnforceLoginGuard } from './enforce-login.guard';

const config = {};

const route: ActivatedRouteSnapshot = {
  url: ['test', '2']
} as any;

let authService: AuthService;
let service: EnforceLoginGuard;

describe('EnforceLoginGuard', () => {
  beforeEach(() => {
    const authConfig = new AuthConfigService(config as OauthConfig);
    authService = jasmine.createSpyObj('authService', ['login', 'isLoggedIn']);

    TestBed.configureTestingModule({
      imports: [RouterTestingModule.withRoutes([{ path: 'auth/forbidden', redirectTo: '/' }])],
      providers: [
        { provide: AuthConfigService, useValue: authConfig },
        { provide: AuthService, useValue: authService },
        EnforceLoginGuard
      ]
    });
    service = TestBed.inject(EnforceLoginGuard);
  });

  it('Not logged in', async () => {
    authService.isLoggedIn = jasmine.createSpy('isLoggedIn').and.returnValue(false);

    const result = await service.canActivate(route);

    expect(result.toString()).toEqual('/auth/forbidden');
    expect(authService.login).toHaveBeenCalledTimes(1);
  });

  it('Logged in', async () => {
    authService.isLoggedIn = jasmine.createSpy('isLoggedIn').and.returnValue(true);

    const result = await service.canActivate(route);

    expect(result).toEqual(true);
    expect(authService.login).toHaveBeenCalledTimes(0);
  });
});
