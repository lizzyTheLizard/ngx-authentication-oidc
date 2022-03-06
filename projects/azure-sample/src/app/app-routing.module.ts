import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthErrorPage } from './pages/auth-error/auth-error.page';
import { NotFoundPage } from './pages/not-found/not-found.page';
import { PrivatePage } from './pages/private/private.page';
import { PublicPage } from './pages/public/public.page';
import { Public2Page } from './pages/public2/public2.page';
import { EnforceLoginGuard } from 'ngx-authentication-oidc';

const routes: Routes = [
  { path: 'public', component: PublicPage },
  { path: 'public2', component: Public2Page },
  { path: 'auth/error', component: AuthErrorPage },
  { path: 'private', component: PrivatePage, canActivate: [EnforceLoginGuard] },
  { path: '', component: PublicPage },
  { path: '**', component: NotFoundPage },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
