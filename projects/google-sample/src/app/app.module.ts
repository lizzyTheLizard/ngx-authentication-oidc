import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AuthenticationModule, OauthConfig } from 'ngx-authentication-oidc';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthErrorPage } from './pages/auth-error/auth-error.page';
import { PrivatePage } from './pages/private/private.page';
import { Public2Page } from './pages/public2/public2.page';
import { NotFoundPage } from './pages/not-found/not-found.page';
import { PublicPage } from './pages/public/public.page';
import { HttpClientModule } from '@angular/common/http';

const config: OauthConfig = {
  clientId:
    '91148398552-4hqhc0etgkg2rp8h4rp4338ronepmq0k.apps.googleusercontent.com',
  clientSecret: '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',
  provider: 'https://accounts.google.com/',
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
