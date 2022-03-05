import { Inject, Injectable } from '@angular/core';
import { Observable, Subject, Subscriber, TeardownLogic } from 'rxjs';
import { AuthConfigService } from '../auth-config.service';
import { DocumentToken, WindowToken } from '../authentication-module.tokens';
import { Logger } from '../configuration/oauth-config';

const watchSessionIframeName = 'watchSessionIFrame';

type EventListener = (e: MessageEvent) => void;

export class SessionWatch extends Observable<void> {
  constructor(
    subscribe: (this: Observable<void>, subscriber: Subscriber<void>) => TeardownLogic,
    public readonly iframe?: HTMLIFrameElement,
    public readonly eventListener?: EventListener,
    public readonly timer?: number
  ) {
    super(subscribe);
  }
}

@Injectable()
export class OidcSessionManagement {
  private readonly logger: Logger;

  constructor(
    private readonly config: AuthConfigService,
    @Inject(DocumentToken) private readonly document: Document,
    @Inject(WindowToken) private readonly window: Window
  ) {
    this.logger = this.config.loggerFactory('OidcSessionManagement');
  }

  public watchSession(sessionState: string): SessionWatch {
    const subject = new Subject<void>();
    const iFrameUrl = this.config.getProviderConfiguration().checkSessionIframe;
    if (!iFrameUrl) {
      this.logger.info('Provider does not support session management');
      return new SessionWatch((obs) => subject.subscribe(obs));
    }
    this.logger.debug('Start watching session');
    const iframe = this.createOpIFrame(sessionState, iFrameUrl);
    const timer = this.createCheckSessionTimer(sessionState, iframe);
    const eventListener = this.createEventListener(iframe, subject);
    this.window.addEventListener('message', eventListener);
    this.document.body.appendChild(iframe);
    return new SessionWatch((obs) => subject.subscribe(obs), iframe, eventListener, timer);
  }

  public stopWatching(sessionWatch: SessionWatch) {
    if (sessionWatch.timer) {
      this.window.clearInterval(sessionWatch.timer);
    }
    if (sessionWatch.iframe) {
      this.document.body.removeChild(sessionWatch.iframe);
    }
    if (sessionWatch.eventListener) {
      this.window.removeEventListener('message', sessionWatch.eventListener);
    }
  }

  private createOpIFrame(sessionState: string, iFrameUrl: string): HTMLIFrameElement {
    const opIframe = this.document.createElement('iframe');
    opIframe.id = watchSessionIframeName + sessionState;
    opIframe.title = watchSessionIframeName + sessionState;
    opIframe.style['display'] = 'none';
    opIframe.setAttribute('src', iFrameUrl);
    return opIframe;
  }

  private createCheckSessionTimer(sessionState: string, opIFrame: HTMLIFrameElement): number {
    const iFrameUrl = opIFrame.getAttribute('src')!;
    const clientId = this.config.clientId;
    const opFrameOrigin = new URL(iFrameUrl).origin;
    const mes = clientId + ' ' + sessionState;
    const interval = this.config.sessionManagement.checkIntervalSeconds * 1000;
    return this.window.setInterval(() => {
      opIFrame!.contentWindow!.postMessage(mes, opFrameOrigin);
    }, interval);
  }

  private createEventListener(iframe: HTMLIFrameElement, subject: Subject<void>): EventListener {
    const iFrameUrl = iframe.getAttribute('src')!;
    const opFrameOrigin = new URL(iFrameUrl).origin;
    const eventListener = (e: MessageEvent) => {
      if (e.origin !== opFrameOrigin) {
        return;
      }
      if (e.data === 'unchanged') {
        this.logger.debug('Session is unchanged');
        return;
      }
      if (e.data === 'error') {
        this.logger.info('Error while watching session, assuming session has ended', e);
      } else if (e.data !== 'changed') {
        this.logger.info('Invalid response, assuming session has ended ' + e.data);
      } else {
        this.logger.info('Session Change detected');
      }
      subject.next();
    };
    return eventListener;
  }
}
