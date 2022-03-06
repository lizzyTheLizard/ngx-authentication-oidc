import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import {
  AuthenticationModule,
  ErrorActionInput,
  OauthConfig,
} from 'ngx-authentication-oidc';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthErrorPage } from './pages/auth-error/auth-error.page';
import { PrivatePage } from './pages/private/private.page';
import { Public2Page } from './pages/public2/public2.page';
import { NotFoundPage } from './pages/not-found/not-found.page';
import { PublicPage } from './pages/public/public.page';
import { HttpClientModule } from '@angular/common/http';

const config: OauthConfig = {
  clientId: 'keycloak-sample',
  provider: 'http://localhost:8080/auth/realms/Test-Application',
  accessTokenUrlPrefixes: 'http://localhost:3000/',
};

@NgModule({
  declarations: [
    AppComponent,
    PublicPage,
    AuthErrorPage,
    PrivatePage,
    Public2Page,
    NotFoundPage,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    AuthenticationModule.forRoot(config),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
