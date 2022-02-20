import { Inject, Injectable } from '@angular/core';
import { Observable, Subject, firstValueFrom, of, timeout } from 'rxjs';
import { AuthConfigService } from '../auth-config.service';
import { DocumentToken, WindowToken } from '../authentication-module.tokens';
import { LoginOptions } from '../configuration/login-options';
import { Logger } from '../configuration/oauth-config';
import { LoginResult } from '../helper/login-result';
import { OidcResponse } from './oidc-response';
import { AuthenticationRequest } from '../helper/authentication-request';
import { LocalUrl } from '../helper/local-url';

const silentRefreshIFrameName = 'silent-refresh-iframe';

@Injectable()
export class OidcSilentLogin {
  private logger: Logger;
  private loginEventListener?: (e: MessageEvent) => void;

  constructor(
    private readonly localUrl: LocalUrl,
    private readonly oidcResponse: OidcResponse,
    private readonly config: AuthConfigService,
    @Inject(DocumentToken) private readonly document: Document,
    @Inject(WindowToken) private readonly window: Window
  ) {
    this.logger = this.config.loggerFactory('OidcSilentLogin');
  }

  public async login(loginOptions: LoginOptions): Promise<LoginResult> {
    this.logger.info('Perform silent login');
    const silentLoginOptions = { ...loginOptions, prompt: 'none' };
    const clientId = this.config.clientId;
    const authEndpoint = this.config.getProviderConfiguration().authEndpoint;
    const redirectUrl =
      this.config.silentLogin.redirectUri ??
      this.localUrl.getLocalUrl('assets/silent-refresh.html').toString();
    const authenticationRequest = new AuthenticationRequest(
      silentLoginOptions,
      redirectUrl,
      clientId,
      authEndpoint
    );
    const url = authenticationRequest.toUrl();
    const iframe = this.createIFrame(url);
    const result = this.setupLoginEventListener(iframe);
    this.document.body.appendChild(iframe);
    const timeoutOptions = {
      each: this.config.silentLogin.timeoutInSecond * 1000,
      with: () => {
        this.logger.info('Silent Login did not return within timeout');
        return of({ isLoggedIn: false });
      }
    };
    return await firstValueFrom(result.pipe(timeout(timeoutOptions))).catch(
      (e) => {
        this.logger.error('Could not perform silent login', e);
        return { isLoggedIn: false };
      }
    );
  }

  private createIFrame(url: URL): HTMLIFrameElement {
    const existingIframe = this.document.getElementById(
      silentRefreshIFrameName
    );
    if (existingIframe) {
      this.document.body.removeChild(existingIframe);
    }
    const iframe = this.document.createElement('iframe');
    iframe.id = silentRefreshIFrameName;
    iframe.style['display'] = 'none';
    iframe.setAttribute('src', url.toString());
    return iframe;
  }

  private setupLoginEventListener(
    iframe: HTMLIFrameElement
  ): Observable<LoginResult> {
    if (this.loginEventListener) {
      this.window.removeEventListener('message', this.loginEventListener);
    }
    const subject = new Subject<LoginResult>();
    this.loginEventListener = (e) => this.handleLoginEvent(subject, iframe, e);
    this.window.addEventListener('message', this.loginEventListener);
    return subject;
  }

  private handleLoginEvent(
    subject: Subject<LoginResult>,
    iframe: HTMLIFrameElement,
    e: MessageEvent
  ) {
    if (e.origin !== this.window.location.origin) {
      return;
    }
    if (!e || !e.data || typeof e.data !== 'string') {
      return;
    }
    if (
      !e.source ||
      ((e.source as any) !== iframe && (e.source as any).parent !== this.window)
    ) {
      return;
    }
    this.window.removeEventListener('message', this.loginEventListener!);
    const redirectUrl = this.config.silentLogin.redirectUri
      ? new URL(this.config.silentLogin.redirectUri)
      : this.localUrl.getLocalUrl('assets/silent-refresh.html');
    this.oidcResponse.urlResponse(new URL(e.data), redirectUrl).then(
      (result) => subject.next(result),
      (error) => {
        this.logger.debug('Could not silently log in: ', error);
        subject.next({ isLoggedIn: false });
      }
    );
  }
}
