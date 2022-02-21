import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AuthenticationModule, OauthConfig, ErrorActionInput } from 'ngx-authentication-oidc';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthErrorPage } from './pages/auth-error/auth-error.page';
import { PrivatePage } from './pages/private/private.page';
import { Public2Page } from './pages/public2/public2.page';
import { NotFoundPage } from './pages/not-found/not-found.page';
import { PublicPage } from './pages/public/public.page';

const config: OauthConfig = {
  clientId: 'keycloak-sample',
  provider: "http://localhost:8080/auth/realms/Test-Application",
  logoutAction: () => alert("You are logged out!"),
  initializationErrorAction: (e: ErrorActionInput) => alert("Error while initialize Login: " + e.error)
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
