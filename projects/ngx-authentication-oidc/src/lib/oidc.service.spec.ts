import { HttpClientTestingModule, HttpTestingController } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { RouterTestingModule } from "@angular/router/testing";
import { AuthenticationModule } from "./authentication-module";
import { ResponseType } from "./configuration/login-options";
import { OidcService, WindowToken } from "./oidc.service";

const config = {
  tokenStore: localStorage,
  client: {clientId: "id", redirectUri: "https://example.com/rd"},
  initializer: () => Promise.resolve({isLoggedIn: false}),
  provider: {authEndpoint: "http://example.com/ta", tokenEndpoint: "http://example.com/te"}
};
const windowMock = { location: { href: 'http://localhost'}};

let service: OidcService;
let httpTestingController: HttpTestingController;

describe('OidcService', () => {
  beforeEach(() => {  
    TestBed.configureTestingModule({
      imports: [
        AuthenticationModule.forRoot(config),
        RouterTestingModule,
        HttpClientTestingModule
      ],
      providers:[
        { provide: WindowToken, useFactory: () => windowMock },
      ],
    });
    httpTestingController = TestBed.inject(HttpTestingController);
    service = TestBed.inject(OidcService);
  });
  
  afterEach(() => {
    httpTestingController.verify();
  });

  it("No Response", async () => {
    windowMock.location.href = 'http://example.com/test';

    service.initialize();
    const res = await service.checkResponse();

    expect(res.accessToken).toBeUndefined();
    expect(res.expiresAt).toBeUndefined();
    expect(res.idToken).toBeUndefined();
    expect(res.isLoggedIn).toBeFalse();
    expect(res.redirectPath).toBeUndefined();
    expect(res.userInfo).toBeUndefined();
  });

  it("Implicit Response", async () => {
    windowMock.location.href = 'http://example.com/rd#access_token=SlAV32hkKG&token_type=bearer&id_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U&expires_in=3600&state=af0ifjsldkj';
    service.initialize();

    const res = await service.checkResponse();

    expect(res.accessToken).toEqual('SlAV32hkKG');
    const expiresIn = Math.round((res.expiresAt!.getTime() - Date.now())/1000); 
    expect(expiresIn).toEqual(3600);
    expect(res.idToken).toEqual('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U');
    expect(res.isLoggedIn).toBeTrue();
    expect(res.redirectPath).toBeUndefined();
    expect(res.userInfo).toEqual({sub: '1234567890'});
  });

  it("Implicit Response Query-Param", async () => {
    windowMock.location.href = 'http://example.com/rd?access_token=SlAV32hkKG&token_type=bearer&id_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U&expires_in=3600&state=af0ifjsldkj';
    service.initialize();

    const res = await service.checkResponse();

    expect(res.accessToken).toEqual('SlAV32hkKG');
    const expiresIn = Math.round((res.expiresAt!.getTime() - Date.now())/1000); 
    expect(expiresIn).toEqual(3600);
    expect(res.idToken).toEqual('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U');
    expect(res.isLoggedIn).toBeTrue();
    expect(res.redirectPath).toBeUndefined();
    expect(res.userInfo).toEqual({sub: '1234567890'});
  });

  it("Implicit Response State", async () => {
    windowMock.location.href = 'http://example.com/rd?access_token=SlAV32hkKG&token_type=bearer&id_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U&expires_in=3600&state=%7B%22state%22%3A%22tst%22%2C%22finalUrl%22%3A%22http%3A%2F%2Fxy%22%7D';
    service.initialize();

    const res = await service.checkResponse();

    expect(res.redirectPath).toEqual("http://xy");
    expect(res.state).toEqual("tst");
  });

  it("Response Error", (done) => {
    windowMock.location.href = 'http://example.com/rd#error=not_possible';
    service.initialize();

    service.checkResponse().then(
      () => done.fail(new Error('This should not work')),
      (e: Error) => {
        expect(e.message).toEqual('Login failed: not_possible')
        done();
      });
  });

  it("Hybrid flow response", (done) => {
    windowMock.location.href = 'http://example.com/rd#code=1234&access_token=123123';
    service.initialize();

    service.checkResponse().then(
      () => done.fail(new Error('This should not work')),
      (e: Error) => {
        expect(e.message).toEqual('Login failed: Hybrid Flow not supported')
        done();
      });
  });

  it("Code Response", async () => {
    windowMock.location.href = 'http://example.com/rd#code=123-123&state=af0ifjsldkj';
    service.initialize();

    service.checkResponse().then(res => {
      expect(res.accessToken).toEqual('SlAV32hkKG');
      const expiresIn = Math.round((res.expiresAt!.getTime() - Date.now())/1000); 
      expect(expiresIn).toEqual(3600);
      expect(res.idToken).toEqual('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U');
      expect(res.isLoggedIn).toBeTrue();
      expect(res.redirectPath).toBeUndefined();
      expect(res.userInfo).toEqual({sub: '1234567890'});
    });

    const req = httpTestingController.expectOne(config.provider.tokenEndpoint);
    expect(req.request.method).toEqual('POST');
    expect(req.request.body.toString()).toEqual("client_id=id&grant_type=authorization_code&code=123-123&redirect_uri=https%3A%2F%2Fexample.com%2Frd")
    req.flush({
      access_token: "SlAV32hkKG",
      token_type: "Bearer",
      refresh_token: "8xLOxBtZp8",
      expires_in: 3600,
      id_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U"
    });    
  });

  it("Code Response State", async () => {
    windowMock.location.href = 'http://example.com/rd#code=123-123&state=%7B%22state%22%3A%22tst%22%2C%22finalUrl%22%3A%22http%3A%2F%2Fxy%22%7D';
    service.initialize();

    service.checkResponse().then(res => {
      expect(res.redirectPath).toEqual("http://xy");
      expect(res.state).toEqual("tst");
    });

    const req = httpTestingController.expectOne(config.provider.tokenEndpoint);
    expect(req.request.method).toEqual('POST');
    expect(req.request.body.toString()).toEqual("client_id=id&grant_type=authorization_code&code=123-123&redirect_uri=https%3A%2F%2Fexample.com%2Frd")
    req.flush({
      access_token: "SlAV32hkKG",
      token_type: "Bearer",
      refresh_token: "8xLOxBtZp8",
      expires_in: 3600,
      id_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U"
    });    
  });

  it("Code Response TokenRequest failed", async () => {
    windowMock.location.href = 'http://example.com/rd#code=123-123';
    service.initialize();

    service.checkResponse().then(
      () => fail(new Error('This should not work')),
      (e: Error) => {
        expect(e.message).toEqual('Login failed: invalid_request')
      });

    const req = httpTestingController.expectOne(config.provider.tokenEndpoint);
    expect(req.request.method).toEqual('POST');
    expect(req.request.body.toString()).toEqual("client_id=id&grant_type=authorization_code&code=123-123&redirect_uri=https%3A%2F%2Fexample.com%2Frd")
    req.flush({error: "invalid_request"}, { status: 400, statusText: "Bad Request"});    
  });

  it("Login default params", async () => {
    service.initialize();

    service.login({});

    const url = new URL(windowMock.location.href);

    expect(url.pathname).toEqual("/ta")
    expect(url.searchParams.get("response_type")).toEqual("code")
    expect(url.searchParams.get("scope")).toEqual("openid profile")
    expect(url.searchParams.get("client_id")).toEqual("id")
    expect(JSON.parse(url.searchParams.get("state")!)).toEqual({});
    expect(url.searchParams.get("redirect_uri")).toEqual("https://example.com/rd")
    expect(url.searchParams.has("nonce")).toBeTrue();
  });

  it("Login special params", async () => {
    service.initialize();

    service.login({
      state: "test",
      finalUrl: "https://example.com/final",
      scope: ["openid", "profile", "email"],
      prompt: "none",
      ui_locales: "de",
      response_type: ResponseType.IMPLICIT_FLOW_TOKEN,
      login_hint: "hint",
      id_token_hint: "id_hint",
      acr_values: "acr"
    });

    const url = new URL(windowMock.location.href);

    expect(url.pathname).toEqual("/ta")
    expect(url.searchParams.get("response_type")).toEqual("id_token token")
    expect(url.searchParams.get("scope")).toEqual("openid profile email")
    expect(url.searchParams.get("client_id")).toEqual("id")
    expect(JSON.parse(url.searchParams.get("state")!)).toEqual({state: "test", finalURL: "https://example.com/final"});
    expect(url.searchParams.get("redirect_uri")).toEqual("https://example.com/rd")
    expect(url.searchParams.has("nonce")).toBeTrue();
    expect(url.searchParams.get("prompt")).toEqual("none")
    expect(url.searchParams.get("ui_locales")).toEqual("de")
    expect(url.searchParams.get("login_hint")).toEqual("hint")
    expect(url.searchParams.get("id_token_hint")).toEqual("id_hint")
    expect(url.searchParams.get("acr_values")).toEqual("acr")
  });

});
