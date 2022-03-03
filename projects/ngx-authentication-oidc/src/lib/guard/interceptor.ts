import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthConfigService } from '../auth-config.service';
import { AuthService } from '../auth.service';
import { Logger } from '../configuration/oauth-config';

@Injectable()
export class AccessTokenInterceptor implements HttpInterceptor {
  private readonly logger: Logger;

  constructor(
    private readonly config: AuthConfigService,
    private readonly authService: AuthService
  ) {
    this.logger = config.loggerFactory('AccessTokenInterceptor');
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.shouldAddAccessToken(req.url)) {
      this.logger.debug('Do not add access token to this URL', req.url);
      return next.handle(req);
    }

    const accessToken = this.authService.getAccessToken();
    if (!accessToken) {
      this.logger.debug('No access token available, do not add to request', req.url);
      return next.handle(req);
    }

    this.logger.debug('Add access token to request', req.url);
    req = req.clone({
      headers: req.headers.set('Authorization', 'Bearer ' + accessToken)
    });
    return next.handle(req);
  }

  private shouldAddAccessToken(url: string) {
    return this.config.accessTokenUrlPrefixes.some((route) => url.startsWith(route));
  }
}
