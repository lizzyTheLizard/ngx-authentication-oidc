import { APP_BASE_HREF } from "@angular/common";
import { HttpClientTestingModule, HttpTestingController } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { RouterTestingModule } from "@angular/router/testing";
import { AuthenticationModule } from "../authentication-module";
import { LoggerFactoryToken } from "../logger/logger";
import { ClientConfig, OauthConfig, ProviderConfig } from "../configuration/oauth-config";
import { OidcLogin } from "./oidc-login";
import { WindowToken } from "../authentication-module.tokens";

const pc: ProviderConfig = {
  authEndpoint: "https://example.com/auth",
  tokenEndpoint: "https://example.com/token",
  issuer: "http://example.com",
  alg: ["HS256"],
  publicKeys: [ {
    kty: "oct",
    alg: "HS256",
    k   : "eW91ci0yNTYtYml0LXNlY3JldA",
    ext: true,
  }],
  maxAge: 10000
}

const cc : ClientConfig = {
  redirectUri: "https://example.com/rd",
  clientId: "id" 
}

const config: OauthConfig = { 
  provider: pc,
  client: cc,
}
const windowMock = {
  addEventListener: jasmine.createSpy('addEventListener'),
  removeEventListener: jasmine.createSpy('removeEventListener '),
  location: { href: 'http://localhost', origin: "http://localhost"}
};

let httpTestingController: HttpTestingController;
let service: OidcLogin;

describe('OidcLogin', () => {
  beforeEach(() => {  
    TestBed.configureTestingModule({
      imports: [
        AuthenticationModule.forRoot(config as OauthConfig),
        RouterTestingModule,
        HttpClientTestingModule
      ],
      providers:[
        { provide: APP_BASE_HREF, useFactory: () => "http://localhost/temp/" },
        { provide: WindowToken, useFactory: () => windowMock },
        { provide: LoggerFactoryToken, useValue: () => console },
      ],
    });

    httpTestingController = TestBed.inject(HttpTestingController);
    service = TestBed.inject(OidcLogin);
  });
  
  afterEach(() => {
    httpTestingController.verify();
  });

  it("Login", () => {
    const loginOptions = {
      stateMessage: "test",
      finalUrl: "https://example.com/final",
    };

    service.login(loginOptions);

    const url = new URL(windowMock.location.href);
    expect(url.pathname).toEqual("/auth")
    expect(url.searchParams.get("response_type")).toEqual("code")
    expect(url.searchParams.get("scope")).toEqual("openid profile")
    expect(url.searchParams.get("client_id")).toEqual("id")
    expect(JSON.parse(url.searchParams.get("state")!)).toEqual({stateMessage: "test", finalUrl: "https://example.com/final"});
    expect(url.searchParams.get("redirect_uri")).toEqual("https://example.com/rd")
    expect(url.searchParams.has("nonce")).toBeTrue();
  });
});
