import { fakeAsync, TestBed, tick } from "@angular/core/testing";
import { RouterTestingModule } from "@angular/router/testing";
import { AuthenticationModule} from "../authentication-module";
import { DocumentToken, WindowToken } from "../authentication-module.tokens";
import { LoggerFactoryToken } from "../logger/logger";
import { ClientConfig, OauthConfig, ProviderConfig } from "../configuration/oauth-config";
import { OidcSessionManagement } from "./oidc-session-management";
import { TokenStoreWrapper } from "../token-store/token-store-wrapper";
import { InitializerToken } from "../initializer/initializer";
import { OidcSilentLogin } from "./oidc-silent-login";


const pc: ProviderConfig = {
  checkSessionIframe: "https://example.com/sc"
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
  location: { href: 'http://localhost', origin: "http://localhost"}
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

const silentLoginMock = {
  login: jasmine.createSpy('OidcSilentLogin').and.returnValue(Promise.resolve({isLoggedIn: false}))
}

const tokenStoreMock = jasmine.createSpyObj('tokenStoreMock', ['getLoginResult','setLoginResult']);

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
        { provide: TokenStoreWrapper, useFactory: () => tokenStoreMock },
        { provide: LoggerFactoryToken, useValue: () => console },
        { provide: OidcSilentLogin, useFactory: () => silentLoginMock},
        { provide: InitializerToken, useValue: () => Promise.resolve({isLoggedIn: false}) },
      ],
    });
    service = TestBed.inject(OidcSessionManagement);
  });
    
  it("Create", () => {
    expect(service).toBeTruthy();
  });

  it("Post message to opIframe when watching", fakeAsync(() => {
    tokenStoreMock.getLoginResult = jasmine.createSpy('getLoginResult').and.returnValue({ isLoggedIn: true, sessionState: '123-123'});
    iframeMock.contentWindow.postMessage.calls.reset();
    service.startWatching();
    tick(6000)
    expect(iframeMock.contentWindow.postMessage).toHaveBeenCalledTimes(1);
    expect(iframeMock.contentWindow.postMessage).toHaveBeenCalledWith(cc.clientId + " " + "123-123", "https://example.com");
    service.stopWatching();
    tick(6000)
    expect(iframeMock.contentWindow.postMessage).toHaveBeenCalledTimes(1);
  }))  

  it("Notification if session changed", async () => {
    tokenStoreMock.getLoginResult = jasmine.createSpy('getLoginResult').and.returnValue({ isLoggedIn: true, sessionState: '123-123'});
    service.startWatching();
    let changes = 0;
    service.sessionChanged$.subscribe(() => changes++);
    eventListener(new MessageEvent("message", {origin: "https://example.com", data: "changed"}));
    expect(changes).toEqual(1);
  })

  it("Notification if error", async () => {
    tokenStoreMock.getLoginResult = jasmine.createSpy('getLoginResult').and.returnValue({ isLoggedIn: true, sessionState: '123-123'});
    service.startWatching();
    let changes = 0;
    let errors = 0;
    service.sessionChanged$.subscribe({ error: () => errors++, next: () => changes++});
    eventListener(new MessageEvent("message", {origin: "https://example.com", data: "error"}));
    expect(changes).toEqual(0);
    expect(errors).toEqual(1);
  })


  it("Ignore if no session state", fakeAsync(() => {
    tokenStoreMock.getLoginResult = jasmine.createSpy('getLoginResult').and.returnValue({ isLoggedIn: true});
    iframeMock.contentWindow.postMessage.calls.reset();
    service.startWatching();
    tick(6000)
    expect(iframeMock.contentWindow.postMessage).toHaveBeenCalledTimes(0);
    let changes = 0;
    service.sessionChanged$.subscribe(() => changes++);
    eventListener(new MessageEvent("message", {origin: "https:/example.com", data: "changed"}));
    expect(changes).toEqual(0);
  }))  
});
