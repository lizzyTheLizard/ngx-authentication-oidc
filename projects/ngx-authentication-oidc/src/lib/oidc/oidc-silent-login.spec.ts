import { APP_BASE_HREF } from "@angular/common";
import { TestBed } from "@angular/core/testing";
import { RouterTestingModule } from "@angular/router/testing";
import { AuthenticationModule, DocumentToken, LoggerFactoryToken, WindowToken } from "../authentication-module";
import { OauthConfig } from "../configuration/oauth-config";
import { OidcLogin } from "./oidc-login";
import { OidcResponse } from "./oidc-response";
import { OidcSilentLogin } from "./oidc-silent-login";


const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.GjKRxKZWcBLTjWTOPSwFBoRsu0zuMkK-uh-7gdfiNDA';

const config = {
  silentLoginTimeoutInSecond: 1
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
const oidcResponse = jasmine.createSpyObj('oidcResponse', ['parseResponseParams', 'handleResponse']);
oidcResponse.parseResponseParams = jasmine.createSpy('parseResponseParams').and.returnValue({});

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
        { provide: OidcLogin, useValue: oidcLogin },
        { provide: OidcResponse, useValue: oidcResponse }
      ],
    });
    service = TestBed.inject(OidcSilentLogin);
  });
    
  it("Silent Login Timeout", async () => {
    windowMock.addEventListener = jasmine.createSpy('addEventListener').and.callFake(() => {});
    oidcResponse.handleResponse = jasmine.createSpy('handleResponse').and.returnValue(Promise.resolve({isLoggedIn: true, idToken: token, accessToken: "SlAV32hkKG"}));

    const result = await service.login({});

    expect(result).toEqual({isLoggedIn: false});
  });

  it("Silent Login Request", async () => {
    windowMock.addEventListener = jasmine.createSpy('addEventListener').and.callFake(() => {});
    
    await service.login({});

    expect(oidcLogin.createAuthenticationRequest.calls.mostRecent().args[0]).toEqual({prompt: "none"});
    expect(iframeMock.setAttribute.calls.mostRecent().args[0]).toEqual("src");
    expect(iframeMock.setAttribute.calls.mostRecent().args[1]).toMatch("https://example.com/auth");
  });  

  it("Silent Login Failed", async () => {
    const mock = {origin: windowMock.location.origin, data: "failed", source: iframeMock};
    windowMock.addEventListener = jasmine.createSpy('addEventListener').and.callFake((m,l) => l(mock));
    oidcResponse.handleResponse = jasmine.createSpy('handleResponse').and.returnValue(Promise.resolve({isLoggedIn: false}));

    const result = await service.login({});

    expect(result).toEqual({isLoggedIn: false});
    expect(oidcResponse.handleResponse.calls.mostRecent().args[0]).toEqual({});
  });

  it("Silent Login Success", async () => {
    const mock = {origin: windowMock.location.origin, data: "access_token=SlAV32hkKG&token_type=bearer&id_token="+ token + "&expires_in=3600&state=af0ifjsldkj", source: iframeMock};
    windowMock.addEventListener = jasmine.createSpy('addEventListener').and.callFake((m,l) => l(mock));
    oidcResponse.handleResponse = jasmine.createSpy('handleResponse').and.returnValue(Promise.resolve({isLoggedIn: true, idToken: token, accessToken: "SlAV32hkKG"}));
    
    const result = await service.login({});

    expect(oidcResponse.parseResponseParams.calls.mostRecent().args[0]).toEqual(mock.data);
    expect(result).toEqual({ isLoggedIn: true, idToken: token, accessToken: "SlAV32hkKG"});
  });  
});
