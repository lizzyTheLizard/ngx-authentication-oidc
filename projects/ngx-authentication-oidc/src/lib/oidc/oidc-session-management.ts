import { Inject, Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { AuthConfigService } from '../auth-config.service';
import { DocumentToken, WindowToken } from '../authentication-module.tokens';
import { LoggerFactoryToken } from '../logger/logger';
import { Logger, LoggerFactory } from '../logger/logger';
import { TokenStoreWrapper } from '../token-store/token-store-wrapper';

const watchSessionIframeName = 'watchSessionIFrame';

class CurrentWatch {
  public readonly opFrameOrigin: string;
  private readonly opIFrame: HTMLIFrameElement;
  private readonly checkSessionTimer: number;
  constructor(
    private readonly iFrameUrl: string,
    private readonly clientId: string,
    private readonly sessionState: string,
    private readonly document: Document,
    private readonly window: Window
  ) {
    this.opIFrame = this.createOpIFrame();
    this.opFrameOrigin = new URL(iFrameUrl).origin;
    this.checkSessionTimer = this.createCheckSessionTimer();
    this.document.body.appendChild(this.opIFrame);
  }

  public stop() {
    this.window.clearInterval(this.checkSessionTimer);
    this.document.body.removeChild(this.opIFrame);
  }

  private createOpIFrame(): HTMLIFrameElement {
    const opIframe = this.document.createElement('iframe');
    opIframe.id = watchSessionIframeName;
    opIframe.title = watchSessionIframeName;
    opIframe.style['display'] = 'none';
    opIframe.setAttribute('src', this.iFrameUrl.toString());
    return opIframe;
  }

  private createCheckSessionTimer(): number {
    const mes = this.clientId + ' ' + this.sessionState;
    return this.window.setInterval(() => {
      this.opIFrame!.contentWindow!.postMessage(mes, this.opFrameOrigin);
    }, 5 * 1000);
  }
}

@Injectable()
export class OidcSessionManagement {
  private readonly logger: Logger;
  public sessionChanged$: Observable<void>;
  private sessionChangedSub: Subject<void>;
  private currentWatch?: CurrentWatch;

  constructor(
    private readonly config: AuthConfigService,
    private readonly tokenStore: TokenStoreWrapper,
    @Inject(DocumentToken) private readonly document: Document,
    @Inject(WindowToken) private readonly window: Window,
    @Inject(LoggerFactoryToken) loggerFactory: LoggerFactory
  ) {
    this.logger = loggerFactory('OidcSessionManagement');
    this.sessionChangedSub = new Subject();
    this.sessionChanged$ = this.sessionChangedSub.asObservable();
    window.addEventListener(
      'message',
      (e) => this.sessionChangeListener(e),
      false
    );
  }

  private sessionChangeListener(e: MessageEvent) {
    const currentWatch = this.currentWatch;
    if (!currentWatch) {
      return;
    }
    if (e.origin !== currentWatch.opFrameOrigin) {
      return;
    }
    if (e.data === 'unchanged') {
      return;
    }
    if (e.data === 'error') {
      this.logger.info('Error while watching session', e);
      this.sessionChangedSub.error(e);
      return;
    }
    if (e.data !== 'changed') {
      this.logger.info('Invalid response from session management ' + e.data);
      this.sessionChangedSub.error(e);
      return;
    }
    this.logger.info('Session Change detected');
    this.sessionChangedSub.next();
  }

  public startWatching() {
    this.stopWatching();
    const sessionState = this.tokenStore.getLoginResult().sessionState;
    if (!sessionState) {
      this.logger.info('Session does not support session management');
      return;
    }
    const iFrameUrl = this.config.getProviderConfiguration().checkSessionIframe;
    if (!iFrameUrl) {
      this.logger.info('Provider does not support session management');
      return;
    }

    this.logger.debug('Start watching session');
    const clientID = this.config.client.clientId;
    this.currentWatch = new CurrentWatch(
      iFrameUrl,
      clientID,
      sessionState,
      this.document,
      this.window
    );
  }

  public stopWatching() {
    const currentWatch = this.currentWatch;
    if (!currentWatch) {
      return;
    }
    this.logger.debug('Stop watching session');
    currentWatch.stop();
    this.currentWatch = undefined;
  }
}
