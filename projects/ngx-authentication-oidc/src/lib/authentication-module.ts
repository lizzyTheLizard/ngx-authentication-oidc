import { Location, LocationStrategy, PathLocationStrategy } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { loginResponseCheck, silentLoginCheck } from './initializer/initializer';
import { AuthConfigService } from './auth-config.service';
import { AuthService } from './auth.service';
import { WindowToken, DocumentToken } from './authentication-module.tokens';
import { OauthConfig } from './configuration/oauth-config';
import { consoleLoggerFactory } from './logger/console-logger';
import { OidcDiscovery } from './oidc/oidc-discovery';
import { OidcLogin } from './oidc/oidc-login';
import { OidcLogout } from './oidc/oidc-logout';
import { OidcResponse } from './oidc/oidc-response';
import { OidcSessionManagement } from './oidc/oidc-session-management';
import { OidcSilentLogin } from './oidc/oidc-silent-login';
import { OidcValidator } from './oidc/oidc-validator';
import { InactiveTimeoutHandler } from './timeout-handler/inactive-timeout-handler';
import { TimeoutHandlerToken } from './timeout-handler/timeout-handler';
import { TokenStoreToken, TokenStoreWrapper } from './token-store/token-store-wrapper';
import { LoggerFactoryToken } from './logger/logger';
import { InitializerToken } from './initializer/initializer';
import { NgIdleModule } from '@ng-idle/core';
import { NoTimeoutHandler } from '../public-api';


/**
 * Main module of the library, has to be imported into our application. The configuration
 * needs to be given as parameter, see {@link OauthConfig}. Provides an instance of {@link AuthService}.
 */
@NgModule({
  imports: [
    HttpClientModule,
    NgIdleModule.forRoot(),
  ],
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
        { provide: InitializerToken, useValue: authConfig.silentLoginEnabled ? silentLoginCheck : loginResponseCheck },
        { provide: TimeoutHandlerToken, useClass: authConfig.inactiveSessionHandlingEnabled ? InactiveTimeoutHandler : NoTimeoutHandler },
        { provide: TokenStoreToken, useValue: localStorage },
        { provide: LoggerFactoryToken, useValue: consoleLoggerFactory },
        AuthService,
        OidcDiscovery,
        OidcResponse,
        OidcLogin,
        OidcLogout,
        OidcSilentLogin,
        OidcValidator,
        OidcSessionManagement,
        TokenStoreWrapper,
      ],
    };
  }

  constructor(authService: AuthService) {
    authService.initialize().catch(e => console.log(e));
  }
}
