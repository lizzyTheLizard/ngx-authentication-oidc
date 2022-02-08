import { Location, LocationStrategy, PathLocationStrategy } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { InjectionToken, ModuleWithProviders, NgModule } from '@angular/core';
import { loginResponseCheck, silentLoginCheck } from '../public-api';
import { AuthConfigService } from './auth-config.service';
import { AuthService } from './auth.service';
import { OauthConfig } from './configuration/oauth-config';
import { consoleLoggerFactory } from './logger/console-logger';
import { OidcDiscovery } from './oidc/oidc-discovery';
import { OidcLogin } from './oidc/oidc-login';
import { OidcLogout } from './oidc/oidc-logout';
import { OidcResponse } from './oidc/oidc-response';
import { OidcSessionManagement } from './oidc/oidc-session-management';
import { OidcSilentLogin } from './oidc/oidc-silent-login';
import { OidcValidator } from './oidc/oidc-validator';
import { DefaultSessionHandler } from './session-handler/default-session-handler';
import { TokenStoreWrapper } from './token-store/token-store-wrapper';

export const WindowToken = new InjectionToken('Window');
export const DocumentToken = new InjectionToken('Document');
export const InitializerToken = new InjectionToken('Initializer');
export const LoggerFactoryToken = new InjectionToken('LoggerFactory');
export const TokenStoreToken = new InjectionToken('TokenStore');
export const SessionHandlerToken = new InjectionToken('SessionHandler');

/**
 * Main module of the library, has to be imported into our application. The configuration
 * needs to be given as parameter, see {@link OauthConfig}. Provides an instance of {@link AuthService}.
 */
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
        { provide: LocationStrategy, useClass: PathLocationStrategy },
        { provide: AuthConfigService, useValue: authConfig },
        { provide: WindowToken, useValue: window },
        { provide: DocumentToken, useValue: document },
        { provide: InitializerToken, useValue: authConfig.silentLoginEnabled ? silentLoginCheck : loginResponseCheck },
        { provide: SessionHandlerToken, useClass: DefaultSessionHandler },
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
