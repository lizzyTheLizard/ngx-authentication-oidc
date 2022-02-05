import { Location } from "@angular/common";
import { Inject, Injectable } from "@angular/core";
import { firstValueFrom, Observable, of, Subject, timeout } from "rxjs";
import { TimeoutConfig } from "rxjs/internal/operators/timeout";
import { AuthConfigService } from "../auth-config.service";
import { DocumentToken, LoggerFactoryToken, WindowToken } from "../authentication-module";
import { LoginOptions } from "../configuration/login-options";
import { Logger, LoggerFactory } from "../logger/logger";
import { LoginResult } from "../login-result";
import { OidcLogin } from "./oidc-login";
import { OidcResponse } from "./oidc-response";

const silentRefreshIFrameName = 'silent-refresh-iframe';

@Injectable()
export class OidcSilentLogin {
  private readonly timeoutOptions: TimeoutConfig<LoginResult,Observable<LoginResult>,LoginResult>;
  private logger: Logger;
  private loginEventListener?: (e: MessageEvent) => void;

  constructor(
      private readonly location: Location,
      private readonly oidcLogin: OidcLogin,
      private readonly oidcResponse: OidcResponse,
      private readonly config: AuthConfigService,
      @Inject(DocumentToken) private readonly document: Document,
      @Inject(WindowToken) private readonly window: Window,
      @Inject(LoggerFactoryToken) private readonly loggerFactory: LoggerFactory){
    this.logger = loggerFactory('OidcSilentLogin');
    this.timeoutOptions = {
      each: this.config.silentLoginTimeoutInSecond * 1000,
      with: () => {
        this.logger.info('Silent Login did not return within timeout');
        return of({isLoggedIn: false});
      }
    };
  }

  public async login(loginOptions: LoginOptions): Promise<LoginResult> {
    const redirectUrl = this.getSilentRefreshUrl().toString();
    const silentLoginOptions = { ... loginOptions, prompt: "none"};
    const url = this.oidcLogin.createAuthenticationRequest(silentLoginOptions, redirectUrl);
    const iframe = this.createIFrame(url);
    const result = this.setupLoginEventListener(iframe);
    this.document.body.appendChild(iframe);
    return firstValueFrom(result.pipe(timeout(this.timeoutOptions)));
  }

  private getSilentRefreshUrl(): URL {
    const urlStr = this.config.silentRefreshRedirectUri ?? this.location.prepareExternalUrl('assets/silent-refresh.html');
    try {
      return new URL(urlStr);
    } catch (e) {
      const result = new URL(this.window.location.href);
      result.pathname = "/assets/silent-refresh.html";
      this.logger.info('silentRefreshRedirectUri and base href are both not set, use origin as redirect URI', result.toString());
      return result;
    }
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

  private setupLoginEventListener(iframe: HTMLIFrameElement) : Observable<LoginResult> {
    if (this.loginEventListener) {
      this.window.removeEventListener('message',this.loginEventListener);
    }
    const subject = new Subject<LoginResult>();
    this.loginEventListener = e => this.handleLoginEvent(subject, iframe, e);
    this.window.addEventListener('message',this.loginEventListener);
    return subject;
  }

  private handleLoginEvent(subject: Subject<LoginResult>, iframe: HTMLIFrameElement, e: MessageEvent){
    if(e.origin !== this.window.location.origin) {
      return;
    }
    if (!e || !e.data || typeof e.data !== 'string') {
      return;
    }
    if(!e.source || (e.source as any !== iframe && (e.source as any).parent !== this.window)) {
      return;
    }
    this.window.removeEventListener("message", this.loginEventListener!);
    const params = this.oidcResponse.parseResponseParams(e.data);
    this.logger.debug('Got silent refresh response', params);
    const redirectUrl = this.getSilentRefreshUrl();
    this.oidcResponse.handleResponse(params, redirectUrl).then(
      result => subject.next(result), 
      error => subject.error(error)
    );
  }
}
