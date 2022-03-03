import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate } from '@angular/router';
import { AuthService } from '../auth.service';

@Injectable()
export class EnforceLoginGuard implements CanActivate {
  constructor(private auth: AuthService) {}

  canActivate(route: ActivatedRouteSnapshot) {
    if (this.auth.isLoggedIn()) {
      return true;
    }
    const newUrl = route.url.toString();
    this.auth.login({ finalUrl: newUrl });
    return false;
  }
}
