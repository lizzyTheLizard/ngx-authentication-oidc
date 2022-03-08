import { Inject, Injectable } from '@angular/core';
import { Observable, Subject, firstValueFrom, of, timeout } from 'rxjs';
import { AuthConfigService } from '../auth-config.service';
import { DocumentToken, WindowToken } from '../authentication-module.tokens';
import { LoginOptions, Prompt } from '../configuration/login-options';
import { Logger } from '../configuration/oauth-config';
import { LoginResult } from '../login-result';
import { AuthenticationRequest } from '../helper/authentication-request';
import { LocalUrl } from '../helper/local-url';
import { TokenStoreWrapper } from '../helper/token-store-wrapper';
import { OidcTokenResponse } from './oidc-token-response';
import { ResponseParameterParser } from '../helper/response-parameter-parser';
import { OidcCodeResponse } from './oidc-code-response';

const silentRefreshIFrameName = 'silent-refresh-iframe';

@Injectable()
export class OidcSilentLogin {
  private readonly responseParameterParser: ResponseParameterParser = new ResponseParameterParser();
  private logger: Logger;
  private loginEventListener?: (e: MessageEvent) => void;

  constructor(
    private readonly localUrl: LocalUrl,
    private readonly oidcTokenResponse: OidcTokenResponse,
    private readonly oidcCodeResponse: OidcCodeResponse,
    private readonly tokenStore: TokenStoreWrapper,
    private readonly config: AuthConfigService,
    @Inject(DocumentToken) private readonly document: Document,
    @Inject(WindowToken) private readonly window: Window
  ) {
    this.logger = this.config.loggerFactory('OidcSilentLogin');
  }

  public async login(loginOptions: LoginOptions): Promise<LoginResult> {
    this.logger.info('Perform silent login');
    const silentLoginOptions = { ...loginOptions, prompts: Prompt.NONE };
    const clientId = this.config.clientId;
    const authEndpoint = this.config.getProviderConfiguration().authEndpoint;
    const redirectUrl =
      this.config.silentLogin.redirectUri ??
      this.localUrl.getLocalUrl('assets/silent-refresh.html').toString();
    const authenticationRequest = new AuthenticationRequest(
      silentLoginOptions,
      redirectUrl,
      clientId,
      authEndpoint,
      this.window
    );
    this.tokenStore.saveNonce(authenticationRequest.nonce);
    this.tokenStore.saveCodeVerifier(authenticationRequest.codeVerifier);
    const url = await authenticationRequest.toUrl();
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
    return await firstValueFrom(result.pipe(timeout(timeoutOptions))).catch((e) => {
      this.logger.error('Could not perform silent login', e);
      return { isLoggedIn: false };
    });
  }

  private createIFrame(url: URL): HTMLIFrameElement {
    const existingIframe = this.document.getElementById(silentRefreshIFrameName);
    if (existingIframe) {
      this.document.body.removeChild(existingIframe);
    }
    const iframe = this.document.createElement('iframe');
    iframe.id = silentRefreshIFrameName;
    iframe.style['display'] = 'none';
    iframe.setAttribute('src', url.toString());
    return iframe;
  }

  private setupLoginEventListener(iframe: HTMLIFrameElement): Observable<LoginResult> {
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
    if (!e.source || ((e.source as any) !== iframe && (e.source as any).parent !== this.window)) {
      return;
    }
    this.window.removeEventListener('message', this.loginEventListener!);
    const url = new URL(e.data);
    const params = this.responseParameterParser.parseUrl(url);
    const redirectUrl = this.config.silentLogin.redirectUri
      ? new URL(this.config.silentLogin.redirectUri)
      : this.localUrl.getLocalUrl('assets/silent-refresh.html');
    const promise = params.code
      ? this.oidcCodeResponse.response(params, redirectUrl)
      : this.oidcTokenResponse.response(true, params);
    promise.then(
      (result: LoginResult) => subject.next(result),
      (error: Error) => {
        this.logger.debug('Could not silently log in: ', error);
        subject.next({ isLoggedIn: false });
      }
    );
  }
}
