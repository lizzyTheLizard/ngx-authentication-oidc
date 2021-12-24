import { APP_BASE_HREF } from "@angular/common";
import { HttpClientTestingModule, HttpTestingController } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { RouterTestingModule } from "@angular/router/testing";
import { AuthenticationModule } from "../authentication-module";
import { ResponseType } from "../configuration/login-options";
import { OauthConfig } from "../configuration/oauth-config";
import { ProviderConfig } from "../configuration/provider-config";
import { DocumentToken, OidcService, WindowToken } from "./oidc.service";
import { ValidatorService } from "./validator.service";

const providerConfig: ProviderConfig = {
  authEndpoint: "http://example.com/ta",
  tokenEndpoint: "http://example.com/te",
  issuer: "http://example.com",
  publicKeys: [{
    kty : "oct",
    kid : "0afee142-a0af-4410-abcc-9f2d44ff45b5",
    alg : "HS256",
    k   : "eyJ"    
  }],
};

const config: OauthConfig = {
  tokenStore: localStorage,
  client: {clientId: "id", redirectUri: "https://example.com/rd"},
  initializer: () => Promise.resolve({isLoggedIn: false}),
  provider: providerConfig,
  silentLoginTimeoutInSecond: 1,
};

const windowMock = {
  addEventListener: jasmine.createSpy('addEventListener'),
  removeEventListener: jasmine.createSpy('removeEventListener '),
  location: { href: 'http://localhost', origin: "http://localhost"}
};

const iframeMock = jasmine.createSpyObj('iframe', ['setAttribute'])
iframeMock.style = new Map();

const documentMock = jasmine.createSpyObj('documentMock', ['createElement', 'getElementById', ]);
documentMock.body = jasmine.createSpyObj('body', ['appendChild']);
documentMock.createElement = jasmine.createSpy('createElement').and.returnValue(iframeMock);

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.GjKRxKZWcBLTjWTOPSwFBoRsu0zuMkK-uh-7gdfiNDA';

let service: OidcService;
let httpTestingController: HttpTestingController;
let validator: ValidatorService;

describe('OidcService', () => {
  beforeEach(() => {  
    validator = jasmine.createSpyObj('validator', ['validate']);

    TestBed.configureTestingModule({
      imports: [
        AuthenticationModule.forRoot(config),
        RouterTestingModule,
        HttpClientTestingModule
      ],
      providers:[
        { provide: APP_BASE_HREF, useFactory: () => "http://localhost/temp/" },
        { provide: WindowToken, useFactory: () => windowMock },
        { provide: DocumentToken, useFactory: () => documentMock },
        { provide: ValidatorService, useValue: validator},
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
    windowMock.location.href = 'http://example.com/rd#access_token=SlAV32hkKG&token_type=bearer&id_token='+ token + '&expires_in=3600&state=af0ifjsldkj';
    service.initialize();

    const res = await service.checkResponse();

    expect(res.accessToken).toEqual('SlAV32hkKG');
    const expiresIn = Math.round((res.expiresAt!.getTime() - Date.now())/1000); 
    expect(expiresIn).toEqual(3600);
    expect(res.idToken).toEqual(token);
    expect(res.isLoggedIn).toBeTrue();
    expect(res.redirectPath).toBeUndefined();
    expect(res.userInfo).toEqual({sub: '1234567890'});
  });

  it("Implicit Response Query-Param", async () => {
    windowMock.location.href = 'http://example.com/rd?access_token=SlAV32hkKG&token_type=bearer&id_token='+ token + '&expires_in=3600&state=af0ifjsldkj';
    service.initialize();

    const res = await service.checkResponse();

    expect(res.accessToken).toEqual('SlAV32hkKG');
    const expiresIn = Math.round((res.expiresAt!.getTime() - Date.now())/1000); 
    expect(expiresIn).toEqual(3600);
    expect(res.idToken).toEqual(token);
    expect(res.isLoggedIn).toBeTrue();
    expect(res.redirectPath).toBeUndefined();
    expect(res.userInfo).toEqual({sub: '1234567890'});
  });

  it("Implicit Response State", async () => {
    windowMock.location.href = 'http://example.com/rd?access_token=SlAV32hkKG&token_type=bearer&id_token=' + token + '&expires_in=3600&state=%7B%22stateMessage%22%3A%22tst%22%2C%22finalUrl%22%3A%22http%3A%2F%2Fxy%22%7D';
    service.initialize();

    const res = await service.checkResponse();

    expect(res.redirectPath).toEqual("http://xy");
    expect(res.stateMessage).toEqual("tst");
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

  it("Code Response", (done) => {
    windowMock.location.href = 'http://example.com/rd#code=123-123&state=af0ifjsldkj';
    service.initialize();

    service.checkResponse().then(res => {
      expect(res.accessToken).toEqual('SlAV32hkKG');
      const expiresIn = Math.round((res.expiresAt!.getTime() - Date.now())/1000); 
      expect(expiresIn).toEqual(3600);
      expect(res.idToken).toEqual(token);
      expect(res.isLoggedIn).toBeTrue();
      expect(res.redirectPath).toBeUndefined();
      expect(res.userInfo).toEqual({sub: '1234567890'});
      done();
    }).catch(e => done.fail(e));

    const req = httpTestingController.expectOne(providerConfig.tokenEndpoint);
    expect(req.request.method).toEqual('POST');
    expect(req.request.body.toString()).toEqual("client_id=id&grant_type=authorization_code&code=123-123&redirect_uri=https%3A%2F%2Fexample.com%2Frd")
    req.flush({
      access_token: "SlAV32hkKG",
      token_type: "Bearer",
      refresh_token: "8xLOxBtZp8",
      expires_in: 3600,
      id_token: token
    });   
  });

  it("Invalid Token", (done) => {
    windowMock.location.href = 'http://example.com/rd#code=123-123&state=af0ifjsldkj';
    service.initialize();

    service.checkResponse().then(() => {
      done.fail('This should not work');
    }).catch(() => done());

    const req = httpTestingController.expectOne(providerConfig.tokenEndpoint);
    expect(req.request.method).toEqual('POST');
    expect(req.request.body.toString()).toEqual("client_id=id&grant_type=authorization_code&code=123-123&redirect_uri=https%3A%2F%2Fexample.com%2Frd")
    req.flush({
      access_token: "SlAV32hkKG",
      token_type: "Bearer",
      refresh_token: "8xLOxBtZp8",
      expires_in: 3600,
      id_token: 'invalid'
    });    
  });

  it("Wrong Signature", (done) => {
    windowMock.location.href = 'http://example.com/rd#code=123-123&state=af0ifjsldkj';
    service.initialize();

    service.checkResponse().then(() => {
      done.fail('This should not work');
    }).catch(() => done());

    const req = httpTestingController.expectOne(providerConfig.tokenEndpoint);
    expect(req.request.method).toEqual('POST');
    expect(req.request.body.toString()).toEqual("client_id=id&grant_type=authorization_code&code=123-123&redirect_uri=https%3A%2F%2Fexample.com%2Frd")
    req.flush({
      access_token: "SlAV32hkKG",
      token_type: "Bearer",
      refresh_token: "8xLOxBtZp8",
      expires_in: 3600,
      id_token: token.substring(0, token.length-2) + 'ds'
    });    
  });

  it("Validation Failed", (done) => {
    validator.validate = jasmine.createSpy('validate').and.throwError(new Error('Not valid'));
    windowMock.location.href = 'http://example.com/rd#code=123-123&state=af0ifjsldkj';
    service.initialize();

    service.checkResponse().then(() => {
      done.fail('This should not work');
    }).catch(() => done());

    const req = httpTestingController.expectOne(providerConfig.tokenEndpoint);
    expect(req.request.method).toEqual('POST');
    expect(req.request.body.toString()).toEqual("client_id=id&grant_type=authorization_code&code=123-123&redirect_uri=https%3A%2F%2Fexample.com%2Frd")
    req.flush({
      access_token: "SlAV32hkKG",
      token_type: "Bearer",
      refresh_token: "8xLOxBtZp8",
      expires_in: 3600,
      id_token: token
    });    
  });

  it("Code Response State", async () => {
    windowMock.location.href = 'http://example.com/rd#code=123-123&state=%7B%22stateMessage%22%3A%22tst%22%2C%22finalUrl%22%3A%22http%3A%2F%2Fxy%22%7D';
    service.initialize();

    service.checkResponse().then(res => {
      expect(res.redirectPath).toEqual("http://xy");
      expect(res.stateMessage).toEqual("tst");
    });

    const req = httpTestingController.expectOne(providerConfig.tokenEndpoint);
    expect(req.request.method).toEqual('POST');
    expect(req.request.body.toString()).toEqual("client_id=id&grant_type=authorization_code&code=123-123&redirect_uri=https%3A%2F%2Fexample.com%2Frd")
    req.flush({
      access_token: "SlAV32hkKG",
      token_type: "Bearer",
      refresh_token: "8xLOxBtZp8",
      expires_in: 3600,
      id_token: token
    });    
  });

  it("Code Response TokenRequest failed", (done) => {
    windowMock.location.href = 'http://example.com/rd#code=123-123';
    service.initialize();

    service.checkResponse().then(
      () => done.fail(new Error('This should not work')),
      (e: Error) => {
        expect(e.message).toEqual('Login failed: invalid_request')
        done();
      });

    const req = httpTestingController.expectOne(providerConfig.tokenEndpoint);
    expect(req.request.method).toEqual('POST');
    expect(req.request.body.toString()).toEqual("client_id=id&grant_type=authorization_code&code=123-123&redirect_uri=https%3A%2F%2Fexample.com%2Frd")
    req.flush({error: "invalid_request"}, { status: 400, statusText: "Bad Request"});    
  });

  it("Login default params", () => {
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

  it("Login special params", () => {
    service.initialize();

    service.login({
      stateMessage: "test",
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
    expect(JSON.parse(url.searchParams.get("state")!)).toEqual({stateMessage: "test", finalUrl: "https://example.com/final"});
    expect(url.searchParams.get("redirect_uri")).toEqual("https://example.com/rd")
    expect(url.searchParams.has("nonce")).toBeTrue();
    expect(url.searchParams.get("prompt")).toEqual("none")
    expect(url.searchParams.get("ui_locales")).toEqual("de")
    expect(url.searchParams.get("login_hint")).toEqual("hint")
    expect(url.searchParams.get("id_token_hint")).toEqual("id_hint")
    expect(url.searchParams.get("acr_values")).toEqual("acr")
  });

  it("Silent Login Timeout", async () => {
    windowMock.addEventListener = jasmine.createSpy('addEventListener').and.callFake(() => {});
    service.initialize();

    const result = await service.silentLogin({});
    expect(result).toEqual({isLoggedIn: false});
  });

  it("Silent Login Failed", async () => {
    const mock = {origin: windowMock.location.origin, data: "failed", source: iframeMock};
    windowMock.addEventListener = jasmine.createSpy('addEventListener').and.callFake((m,l) => l(mock));
    
    service.initialize();

    const result = await service.silentLogin({});

    expect(result).toEqual({isLoggedIn: false});
  });

  it("Silent Login Request", async () => {
    const mock = {origin: windowMock.location.origin, data: "failed", source: iframeMock};
    windowMock.addEventListener = jasmine.createSpy('addEventListener').and.callFake((m,l) => l(mock));
    service.initialize();

    await service.silentLogin({});

    expect(iframeMock.setAttribute.calls.mostRecent().args[0]).toEqual("src");
    expect(iframeMock.setAttribute.calls.mostRecent().args[1]).toMatch("response_type=code");
    expect(iframeMock.setAttribute.calls.mostRecent().args[1]).toMatch("scope=openid\\+profile");
    expect(iframeMock.setAttribute.calls.mostRecent().args[1]).toMatch("client_id=id");
    expect(iframeMock.setAttribute.calls.mostRecent().args[1]).toMatch("state=%7B%7D");
    expect(iframeMock.setAttribute.calls.mostRecent().args[1]).toMatch("redirect_uri=http%3A%2F%2Flocalhost%2Ftemp%2Fassets%2Fsilent-refresh.html");
    expect(iframeMock.setAttribute.calls.mostRecent().args[1]).toMatch("&prompt=none"); 
  });    

  it("Silent Login Success", async () => {
    const mock = {origin: windowMock.location.origin, data: "access_token=SlAV32hkKG&token_type=bearer&id_token="+ token + "&expires_in=3600&state=af0ifjsldkj", source: iframeMock};
    windowMock.addEventListener = jasmine.createSpy('addEventListener').and.callFake((m,l) => l(mock));
    service.initialize();

    const result = await service.silentLogin({});

    expect(result.isLoggedIn).toEqual(true);
    expect(result.accessToken).toEqual('SlAV32hkKG');
    expect(result.idToken).toEqual(token);
    expect(result.userInfo).toEqual({ sub: '1234567890' });
    expect(result.stateMessage).toEqual('af0ifjsldkj');
    const expiresIn = Math.round((result.expiresAt!.getTime() - Date.now())/1000); 
    expect(expiresIn).toEqual(3600);
  });  
});
