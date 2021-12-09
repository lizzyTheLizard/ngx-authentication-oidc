import { Location, LocationStrategy, PathLocationStrategy } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { AuthConfigService } from './auth-config.service';
import { AuthService } from './auth.service';
import { OauthConfig } from './configuration/oauth-config';
import { OidcService, WindowToken, DocumentToken } from './oidc/oidc.service';

@NgModule({
  imports: [ HttpClientModule],
})
export class AuthenticationModule {
  static forRoot(config: OauthConfig): ModuleWithProviders<AuthenticationModule> {
    const authConfig = new AuthConfigService(config);
    return {
      ngModule: AuthenticationModule,
      providers: [
        Location,
        {provide: LocationStrategy, useClass: PathLocationStrategy},
        { provide: AuthConfigService, useValue: authConfig },
        { provide: WindowToken, useFactory: () => window},
        { provide: DocumentToken, useFactory: () => document},
        AuthService,
        OidcService,
      ],
    };
  }

  constructor(authService: AuthService) {
    authService.initialize();
  }
}
