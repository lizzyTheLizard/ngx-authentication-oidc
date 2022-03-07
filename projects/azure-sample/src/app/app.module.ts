import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
// eslint-disable-next-line prettier/prettier
import { AuthenticationModule, OauthConfig, redirect, silentRedirectLoginCheck } from 'ngx-authentication-oidc';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthErrorPage } from './pages/auth-error/auth-error.page';
import { PrivatePage } from './pages/private/private.page';
import { Public2Page } from './pages/public2/public2.page';
import { NotFoundPage } from './pages/not-found/not-found.page';
import { PublicPage } from './pages/public/public.page';
import { HttpClientModule } from '@angular/common/http';

const config: OauthConfig = {
  clientId: '472ab98a-e1c9-4eda-b6d1-646a4cce3093',
  provider:
    'https://login.microsoftonline.com/7bd72b43-52f6-4dc6-a856-5704e0f925bd/v2.0/',
  // With AD we normally do not want to do a single logout
  logoutAction: redirect('/'),
  // AD does not allow iframe-login, so perform a redirect login
  initializer: silentRedirectLoginCheck,
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
