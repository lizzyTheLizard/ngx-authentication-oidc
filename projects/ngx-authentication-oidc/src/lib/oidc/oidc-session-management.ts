import { Inject, Injectable } from "@angular/core";
import { Observable, Subject } from "rxjs";
import { AuthConfigService } from "../auth-config.service";
import { DocumentToken, WindowToken } from "../authentication-module.tokens";
import { LoggerFactoryToken } from "../logger/logger";
import { Logger, LoggerFactory } from "../logger/logger";
import { LoginResult } from "../login-result";

const watchSessionIframeName = 'watchSessionIFrame';

class OidcSessionWatcher {
  private readonly opIFrame: HTMLIFrameElement;
  private readonly checkSessionTimer: number;
  private readonly origin: string;

  constructor(private readonly subject: Subject<void>, 
              private readonly iFrameUrl: string, 
              public readonly sessionState: string, 
              private readonly clientId: string, 
              private readonly document: Document,
              private readonly window: Window){
    this.opIFrame = this.createOpIFrame(iFrameUrl);
    this.checkSessionTimer = this.createCheckSessionTimer();
    this.document.body.appendChild(this.opIFrame);
    this.origin = new URL(iFrameUrl).origin;
  }

  public sessionChangeListener(e: MessageEvent){
    if (e.origin !== this.origin) {
      return;
    }
    if (e.data === "unchanged") {
      return;
    }
    if (e.data === "error") {
      this.subject.error(e);
      return;
    }
    if (e.data !== "changed") {
      this.subject.error('Invalid response from session management ' + e.data);
      return;
    }
    this.subject.next();
  }

  public stopWatching(){
    this.window.clearInterval(this.checkSessionTimer!);
    this.document.body.removeChild(this.opIFrame);
  }

  private createOpIFrame(iFrameUrl:string): HTMLIFrameElement {
    const opIframe = this.document.createElement('iframe');
    opIframe.id = watchSessionIframeName;
    opIframe.title = watchSessionIframeName;
    opIframe.style['display'] = 'none';
    opIframe.setAttribute('src', iFrameUrl);
    return opIframe;
  }

  private createCheckSessionTimer(): number {
    const mes = this.clientId + " " + this.sessionState;
    return this.window.setInterval(() => {
      this.opIFrame.contentWindow!.postMessage(mes, this.origin);
    } , 5 * 1000);
  }
}

@Injectable()
export class OidcSessionManagement {
  private readonly logger: Logger;
  private readonly sessionChangedSub: Subject<void>;
  private currentWatcher?: OidcSessionWatcher;
  public sessionChanged$: Observable<void>;
 
  constructor(
      private readonly config: AuthConfigService,
      @Inject(DocumentToken) private readonly document: Document,
      @Inject(WindowToken) private readonly window: Window,
      @Inject(LoggerFactoryToken) loggerFactory: LoggerFactory){
    this.logger = loggerFactory('OidcSessionManagement');
    window.addEventListener('message', e => this.sessionChangeListener(e), false);
    this.sessionChangedSub = new Subject();
    this.sessionChanged$ = this.sessionChangedSub.asObservable();
  }

  private sessionChangeListener(e: MessageEvent){
    if(!this.currentWatcher) {
      return;
    }
    this.currentWatcher.sessionChangeListener(e);
  }

  public startWatching(session: LoginResult) {
    if(!session.sessionState) {
      this.logger.info('Session does not support session management');
      return;
    }
    if(this.currentWatcher?.sessionState === session.sessionState) {
      this.logger.info('Session is already watched');
      return;
    }
    const iFrameUrl = this.config.getProviderConfiguration().checkSessionIframe;
    if(!iFrameUrl) {
      this.logger.info('Provider does not support session management');
      return;
    }
    this.logger.debug('Start watching session');
    this.currentWatcher = new OidcSessionWatcher(this.sessionChangedSub, iFrameUrl, session.sessionState, 
      this.config.client.clientId, this.document, this.window);
  }

  public stopWatching(){
    if(!this.currentWatcher) {
      return
    }
    this.currentWatcher.stopWatching();
    this.currentWatcher = undefined;
    this.logger.debug('Stop watching session');
  }  
}
