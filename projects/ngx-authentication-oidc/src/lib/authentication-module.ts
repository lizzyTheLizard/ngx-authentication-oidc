import { HttpClientModule } from '@angular/common/http';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { AuthConfigService } from './auth-config.service';
import { AuthService } from './auth.service';
import { OauthConfig } from './configuration/oauth-config';
import { OidcService, WindowToken } from './oidc.service';

@NgModule({
  imports: [ HttpClientModule],
})
export class AuthenticationModule {
  static forRoot(config: OauthConfig): ModuleWithProviders<AuthenticationModule> {
    const authConfig = new AuthConfigService(config);
    return {
      ngModule: AuthenticationModule,
      providers: [
        { provide: AuthConfigService, useValue: authConfig },
        { provide: WindowToken, useFactory: () => window},
        AuthService,
        OidcService,
      ],
    };
  }

  constructor(authService: AuthService) {
    authService.initialize();
  }
}
