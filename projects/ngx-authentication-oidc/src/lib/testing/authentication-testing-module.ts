import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { AuthService } from '../auth.service';
import { SessionService } from '../session.service';
import { AuthTestingService } from './auth-testing.service';
import { SessionTestingService } from './session-testing-service';

@NgModule({
  imports: [HttpClientTestingModule]
})
export class AuthenticationTestingModule {
  static forRoot(): ModuleWithProviders<AuthenticationTestingModule> {
    return {
      ngModule: AuthenticationTestingModule,
      providers: [
        AuthTestingService,
        { provide: AuthService, useExisting: AuthTestingService },
        SessionTestingService,
        { provide: SessionService, useExisting: SessionTestingService }
      ]
    };
  }

  constructor(authService: AuthService) {
    authService.initialize().catch((e) => console.log(e));
  }
}
