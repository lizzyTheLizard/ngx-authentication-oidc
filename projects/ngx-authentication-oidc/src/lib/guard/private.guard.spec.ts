import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AuthConfigService } from '../auth-config.service';
import { AuthService } from '../auth.service';
import { OauthConfig } from '../configuration/oauth-config';
import { PrivateGuard } from './private.guard';

const config = {};

let authService: AuthService;
let service: PrivateGuard;

describe('PrivateGuard', () => {
  beforeEach(() => {
    const authConfig = new AuthConfigService(config as OauthConfig);
    authService = jasmine.createSpyObj('authService', ['login', 'isLoggedIn']);

    TestBed.configureTestingModule({
      imports: [RouterTestingModule.withRoutes([{ path: 'auth/forbidden', redirectTo: '/' }])],
      providers: [
        { provide: AuthConfigService, useValue: authConfig },
        { provide: AuthService, useValue: authService },
        PrivateGuard
      ]
    });
    service = TestBed.inject(PrivateGuard);
  });

  it('Not logged in', async () => {
    authService.isLoggedIn = jasmine.createSpy('isLoggedIn').and.returnValue(false);

    const result = await service.canActivate();

    expect(result.toString()).toEqual('/auth/forbidden');
  });

  it('Logged in', async () => {
    authService.isLoggedIn = jasmine.createSpy('isLoggedIn').and.returnValue(true);

    const result = await service.canActivate();

    expect(result).toEqual(true);
  });
});
