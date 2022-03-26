/* global window, document, console */
import { Location, LocationStrategy, PathLocationStrategy } from '@angular/common';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { AuthConfigService } from './auth-config.service';
import { AuthService } from './auth.service';
import { DocumentToken, WindowToken } from './authentication-module.tokens';
import { OauthConfig } from './configuration/oauth-config';
import { OidcDiscovery } from './oidc/oidc-discovery';
import { OidcLogin } from './oidc/oidc-login';
import { OidcLogout } from './oidc/oidc-logout';
import { OidcSessionManagement } from './oidc/oidc-session-management';
import { OidcSilentLogin } from './oidc/oidc-silent-login';
import { OidcTokenValidator } from './oidc/oidc-token-validator';
import { TokenStoreWrapper } from './helper/token-store-wrapper';
import { NgIdleModule } from '@ng-idle/core';
import { OidcRefresh } from './oidc/oidc-refresh';
import { LocalUrl } from './helper/local-url';
import { OidcCodeResponse } from './oidc/oidc-code-response';
import { OidcTokenResponse } from './oidc/oidc-token-response';
import { AccessTokenInterceptor } from './guard/access-token-interceptor';
import { PrivateGuard } from './guard/private.guard';
import { EnforceLoginGuard } from './guard/enforce-login.guard';
import { SessionService } from './session.service';
import { OidcAuthenticationRequest } from './oidc/oidc-authentication-request';

/**
 * Main module of the library, has to be imported into our application. The configuration
 * needs to be given as parameter, see {@link OauthConfig}.
 * Provides an instance of {@link AuthService}.
 */
@NgModule({
  imports: [HttpClientModule, NgIdleModule.forRoot()]
})
export class AuthenticationModule {
  static forRoot(config: OauthConfig): ModuleWithProviders<AuthenticationModule> {
    const authConfig = new AuthConfigService(config);
    return {
      ngModule: AuthenticationModule,
      providers: [
        Location,
        { provide: LocationStrategy, useClass: PathLocationStrategy },
        { provide: AuthConfigService, useValue: authConfig },
        { provide: WindowToken, useValue: window },
        { provide: DocumentToken, useValue: document },
        {
          provide: HTTP_INTERCEPTORS,
          useClass: AccessTokenInterceptor,
          multi: true
        },
        AuthService,
        OidcDiscovery,
        OidcLogin,
        OidcLogout,
        OidcSilentLogin,
        OidcTokenValidator,
        OidcSessionManagement,
        OidcRefresh,
        OidcCodeResponse,
        OidcTokenResponse,
        OidcAuthenticationRequest,
        TokenStoreWrapper,
        SessionService,
        LocalUrl,
        PrivateGuard,
        EnforceLoginGuard
      ]
    };
  }

  /* eslint-disable @typescript-eslint/no-unused-vars */
  // Inject those services as we need to have an instance of them!
  constructor(authService: AuthService, _tokenUpdater: SessionService) {
    authService.initialize().catch((e) => console.log(e));
  }
}
