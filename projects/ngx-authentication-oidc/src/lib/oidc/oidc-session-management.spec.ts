import { fakeAsync, TestBed, tick } from "@angular/core/testing";
import { RouterTestingModule } from "@angular/router/testing";
import { AuthenticationModule, DocumentToken, LoggerFactoryToken, WindowToken } from "../authentication-module";
import { ClientConfig, OauthConfig, ProviderConfig } from "../configuration/oauth-config";
import { OidcSessionManagement } from "./oidc-session-management";


const pc: ProviderConfig = {
  checkSessionIframe: "https:/example.com/sc"
} as any;

const cc : ClientConfig = {
  clientId: "id" 
} as any;


const config = {
  provider: pc,
  client: cc,
};

let eventListener: EventListener;

const windowMock = {
  addEventListener: jasmine.createSpy('addEventListener').and.callFake((m,l) => eventListener = l),
  postMessage: jasmine.createSpy('postMessage'),
  setInterval: (a: () => void,b: number) => setInterval(a,b),
  clearInterval: (a: number) => clearInterval(a),
};

const iframeMock = {
  setAttribute: jasmine.createSpy('setAttribute'),
  contentWindow: {
    postMessage: jasmine.createSpy('postMessage')
  },
  style: new Map()
};

const documentMock = {
  body: jasmine.createSpyObj('body', ['appendChild','removeChild']),
  createElement: jasmine.createSpy('createElement').and.returnValue(iframeMock),
};

let service: OidcSessionManagement;

describe('OidcSessionManagement', () => {
  beforeEach(() => {  
    TestBed.configureTestingModule({
      imports: [
        AuthenticationModule.forRoot(config as OauthConfig),
        RouterTestingModule,
      ],
      providers:[
        { provide: WindowToken, useFactory: () => windowMock },
        { provide: DocumentToken, useFactory: () => documentMock },
        { provide: LoggerFactoryToken, useValue: () => console },
      ],
    });
    service = TestBed.inject(OidcSessionManagement);
  });
    
  it("Create", () => {
    expect(service).toBeTruthy();
  });

  it("Post message to opIframe when watching", fakeAsync(() => {
    iframeMock.contentWindow.postMessage.calls.reset();
    service.startWatching({ isLoggedIn: true, sessionState: '123-123'});
    tick(6000)
    expect(iframeMock.contentWindow.postMessage).toHaveBeenCalledTimes(1);
    expect(iframeMock.contentWindow.postMessage).toHaveBeenCalledWith(cc.clientId + " " + "123-123", pc.checkSessionIframe);
    service.stopWatching();
    tick(6000)
    expect(iframeMock.contentWindow.postMessage).toHaveBeenCalledTimes(1);
  }))  

  it("Notification if session changed", async () => {
    service.startWatching({ isLoggedIn: true, sessionState: '123-123'});
    let changes = 0;
    service.sessionChanged$.subscribe(() => changes++);
    eventListener(new MessageEvent("message", {origin: pc.checkSessionIframe, data: "changed"}));
    expect(changes).toEqual(1);
  })

  it("Notification if error", async () => {
    service.startWatching({ isLoggedIn: true, sessionState: '123-123'});
    let changes = 0;
    let errors = 0;
    service.sessionChanged$.subscribe({ error: () => errors++, next: () => changes++});
    eventListener(new MessageEvent("message", {origin: pc.checkSessionIframe, data: "error"}));
    expect(changes).toEqual(0);
    expect(errors).toEqual(1);
  })


  it("Ignore if no session state", fakeAsync(() => {
    iframeMock.contentWindow.postMessage.calls.reset();
    service.startWatching({ isLoggedIn: true});
    tick(6000)
    expect(iframeMock.contentWindow.postMessage).toHaveBeenCalledTimes(0);
    let changes = 0;
    service.sessionChanged$.subscribe(() => changes++);
    eventListener(new MessageEvent("message", {origin: pc.checkSessionIframe, data: "changed"}));
    expect(changes).toEqual(0);
  }))  
});