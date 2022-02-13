import { APP_BASE_HREF } from "@angular/common";
import { fakeAsync, TestBed, tick } from "@angular/core/testing";
import { RouterTestingModule } from "@angular/router/testing";
import { AuthenticationModule } from "../authentication-module";
import { DocumentToken, WindowToken } from "../authentication-module.tokens";
import { LoggerFactoryToken } from "../logger/logger";
import { OauthConfig } from "../configuration/oauth-config";
import { OidcLogin } from "./oidc-login";
import { OidcResponse } from "./oidc-response";
import { OidcSilentLogin } from "./oidc-silent-login";
import { InitializerToken } from "../initializer/initializer";


const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.GjKRxKZWcBLTjWTOPSwFBoRsu0zuMkK-uh-7gdfiNDA';

const config = {
  silentLoginTimeoutInSecond: 1,
  client: { clientId: 'id'},
  provider: {
    authEndpoint: "https://example.com/auth"
  },
};

const windowMock = {
  addEventListener: jasmine.createSpy('addEventListener'),
  removeEventListener: jasmine.createSpy('removeEventListener '),
  location: { href: 'http://localhost', origin: "http://localhost"}
};

const iframeMock = {
  setAttribute: jasmine.createSpy('setAttribute'),
  style: new Map()
};

const documentMock = {
  getElementById: jasmine.createSpy('getElementById'),
  body: jasmine.createSpyObj('body', ['appendChild']),
  createElement: jasmine.createSpy('createElement').and.returnValue(iframeMock),
};

const oidcLogin = jasmine.createSpyObj('oidcLogin', ['createAuthenticationRequest']);
oidcLogin.createAuthenticationRequest = jasmine.createSpy('createAuthenticationRequest').and.returnValue(new URL("https://example.com/auth"))
const oidcResponse = jasmine.createSpyObj('oidcResponse', ['handleURLResponse']);

let service: OidcSilentLogin;


describe('OidcSilentLogin', () => {
  beforeEach(() => {  
    TestBed.configureTestingModule({
      imports: [
        AuthenticationModule.forRoot(config as OauthConfig),
        RouterTestingModule,
      ],
      providers:[
        { provide: APP_BASE_HREF, useFactory: () => "http://localhost/temp/" },
        { provide: WindowToken, useFactory: () => windowMock },
        { provide: DocumentToken, useFactory: () => documentMock },
        { provide: LoggerFactoryToken, useValue: () => console },
        { provide: InitializerToken, useValue: () => Promise.resolve({isLoggedIn: false})},
        { provide: OidcLogin, useValue: oidcLogin },
        { provide: OidcResponse, useValue: oidcResponse }
      ],
    });
    service = TestBed.inject(OidcSilentLogin);
  });
    
  it("Silent Login Timeout", fakeAsync(() => {
    windowMock.addEventListener = jasmine.createSpy('addEventListener').and.callFake(() => {});
    oidcResponse.handleURLResponse = jasmine.createSpy('handleURLResponse').and.returnValue(Promise.resolve({isLoggedIn: true, idToken: token, accessToken: "SlAV32hkKG"}));

    const result = service.login({});
    tick(6000)
    expectAsync(result).toBeResolvedTo({isLoggedIn: false});
  }));

  it("Silent Login Request", async () => {
    const mock = {origin: windowMock.location.origin, data: "https://example.com/rd?error=failed", source: iframeMock};
    windowMock.addEventListener = jasmine.createSpy('addEventListener').and.callFake((m,l) => l(mock));
    oidcResponse.handleURLResponse = jasmine.createSpy('handleURLResponse').and.returnValue(Promise.resolve({isLoggedIn: false}));
    
    await service.login({});

    expect(iframeMock.setAttribute.calls.mostRecent().args[0]).toEqual("src");
    expect(iframeMock.setAttribute.calls.mostRecent().args[1]).toMatch("https://example.com/auth");
  });  

  it("Silent Login Failed", async () => {
    const mock = {origin: windowMock.location.origin, data: "https://example.com/rd?error=failed", source: iframeMock};
    windowMock.addEventListener = jasmine.createSpy('addEventListener').and.callFake((m,l) => l(mock));
    oidcResponse.handleURLResponse = jasmine.createSpy('handleURLResponse').and.returnValue(Promise.resolve({isLoggedIn: false}));

    const result = await service.login({});

    expect(oidcResponse.handleURLResponse.calls.mostRecent().args[0]).toEqual(mock.data);
    expect(result).toEqual({isLoggedIn: false});
  });

  it("Silent Login Success", async () => {
    const mock = {origin: windowMock.location.origin, data: "https://example.com/rd?access_token=SlAV32hkKG&token_type=bearer&id_token="+ token + "&expires_in=3600&state=af0ifjsldkj", source: iframeMock};
    windowMock.addEventListener = jasmine.createSpy('addEventListener').and.callFake((m,l) => l(mock));
    oidcResponse.handleURLResponse = jasmine.createSpy('handleURLResponse').and.callFake(() => {
      return Promise.resolve({isLoggedIn: true, idToken: token, accessToken: "SlAV32hkKG"});
    });
    
    const result = await service.login({});

    expect(oidcResponse.handleURLResponse.calls.mostRecent().args[0]).toEqual(mock.data);
    expect(result).toEqual({ isLoggedIn: true, idToken: token, accessToken: "SlAV32hkKG"});
  });  
});
