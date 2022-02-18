import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AuthenticationModule, enforceLogin, OauthConfig } from 'ngx-authentication-oidc';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthErrorPage } from './pages/auth-error/auth-error.page';
import { PrivatePage } from './pages/private/private.page';
import { Public2Page } from './pages/public2/public2.page';
import { NotFoundPage } from './pages/not-found/not-found.page';
import { PublicPage } from './pages/public/public.page';

const config: OauthConfig = {
  client: {
    clientId: 'keycloak-sample',
    redirectUri: 'http://localhost:4200/'
  },
  provider: "http://localhost:8080/auth/realms/Test-Application",
  logoutUrl: 'public',
  errorUrl: 'auth/error',
  autoUpdate: {
    updateIntervalSeconds: 60,
    minimalValiditySeconds: 90
  },
  inactiveTimeout: {
    idleTimeSeconds: 300,
    timeoutSeconds: 60,
  },
  initializer: enforceLogin
}

@NgModule({
  declarations: [
    AppComponent,
    PublicPage,
    AuthErrorPage,
    PrivatePage,
    Public2Page,
    NotFoundPage
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    AuthenticationModule.forRoot(config),
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
