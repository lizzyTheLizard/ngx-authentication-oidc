import { APP_BASE_HREF } from "@angular/common";
import { HttpClientTestingModule, HttpTestingController } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { Validator } from "@angular/forms";
import { RouterTestingModule } from "@angular/router/testing";
import { AuthConfigService } from "../auth-config.service";
import { AuthenticationModule } from "../authentication-module";
import { LoggerFactoryToken } from "../logger/logger";
import { ClientConfig, OauthConfig, ProviderConfig } from "../configuration/oauth-config";
import { OidcResponse, ResponseParams } from "./oidc-response";
import { OidcValidator } from "./oidc-validator";
import { WindowToken } from "../authentication-module.tokens";

const pc: ProviderConfig = {
  authEndpoint: "http://xx",
  tokenEndpoint: "http://xx",
  issuer: "http://xx",
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

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';

const windowMock = {
  addEventListener: jasmine.createSpy('addEventListener'),
  removeEventListener: jasmine.createSpy('removeEventListener '),
  location: { href: 'http://localhost', origin: "http://localhost"}
};

let httpTestingController: HttpTestingController;
let service: OidcResponse;
let validator: Validator;

describe('OidcResponse', () => {
  beforeEach(() => {  
    validator = jasmine.createSpyObj('validator', ['validate']);

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
        { provide: OidcValidator, useValue: validator},
      ],
    });

    httpTestingController = TestBed.inject(HttpTestingController);
    service = TestBed.inject(OidcResponse);
    const configService = TestBed.inject(AuthConfigService);
    configService.setProviderConfiguration(pc);
  });
  
  afterEach(() => {
    httpTestingController.verify();
  });

  it("No Response", async () => {
    windowMock.location.href = 'http://example.com/test';

    expect(service.isResponse()).toBeFalse();
  });

  it("Has Response", async () => {
    windowMock.location.href = 'http://example.com/rd#access_token=SlAV32hkKG&token_type=bearer&id_token=token&expires_in=3600&state=af0ifjsldkj';

    expect(service.isResponse()).toBeTrue();
  });

  it("Parse Hash Response", () => {
    windowMock.location.href = 'http://example.com/rd#access_token=SlAV32hkKG&token_type=bearer&id_token=token&expires_in=3600&state=af0ifjsldkj';

    const res = service.getResponseParamsFromQueryString();

    expect(res).toEqual({
      stateMessage: "af0ifjsldkj",
      expires_in: "3600",
      id_token: 'token',
      access_token: "SlAV32hkKG",
    });
  });

  it("Parse Query Response", () => {
    windowMock.location.href = 'http://example.com/rd?access_token=SlAV32hkKG&token_type=bearer&id_token=token&expires_in=3600&state=af0ifjsldkj';

    const res = service.getResponseParamsFromQueryString();

    expect(res).toEqual({
      stateMessage: "af0ifjsldkj",
      expires_in: "3600",
      id_token: 'token',
      access_token: "SlAV32hkKG"
    });
  });

  it("Parse Error Response", () => {
    windowMock.location.href = 'http://example.com/rd#error=not_possible';

    const res = service.getResponseParamsFromQueryString();

    expect(res).toEqual({error: "not_possible"});
  });

  it("Parse Response Parameter directly", () => {
    const res = service.parseResponseParams("access_token=SlAV32hkKG&token_type=bearer&id_token=token&expires_in=3600&state=af0ifjsldkj");

    expect(res).toEqual({
      stateMessage: "af0ifjsldkj",
      expires_in: "3600",
      id_token: 'token',
      access_token: "SlAV32hkKG"
    });
  });

  it("Handle Implicit Response", async () => {
    const params: ResponseParams = {
      stateMessage: "af0ifjsldkj",
      expires_in: "3600",
      id_token: token,
      access_token: "SlAV32hkKG"
    };

    const res = await service.handleResponse(params);

    expect(res.accessToken).toEqual('SlAV32hkKG');
    const expiresIn = Math.round((res.expiresAt!.getTime() - Date.now())/1000); 
    expect(expiresIn).toEqual(3600);
    expect(res.idToken).toEqual(token);
    expect(res.isLoggedIn).toBeTrue();
    expect(res.redirectPath).toBeUndefined();
    expect(res.userInfo).toEqual({sub: '1234567890'});
  });

  it("Handle Implicit Response State", async () => {
    const params: ResponseParams = {
      stateMessage: "tst",
      finalUrl: "http://xy",
      expires_in: "3600",
      id_token: token,
      access_token: "SlAV32hkKG"
    };
    const res = await service.handleResponse(params);

    expect(res.redirectPath).toEqual("http://xy");
    expect(res.stateMessage).toEqual("tst");
  });

  it("Handle Error Response", (done) => {
    const params: ResponseParams = {
      error: "not_possible"
    };

    service.handleResponse(params).then(
      () => done.fail(new Error('This should not work')),
      (e: Error) => {
        expect(e.message).toEqual('Login failed: not_possible')
        done();
      });
  });

  it("Handle Hybrid Response", (done) => {
    const params: ResponseParams = {
      code: "1234",
      access_token: "123123"
    };

    service.handleResponse(params).then(
      () => done.fail(new Error('This should not work')),
      (e: Error) => {
        expect(e.message).toEqual('Login failed: Hybrid Flow not supported')
        done();
      });
  });

  it("Handle Code Response", (done) => {
    const params: ResponseParams = {
      code: "123-123",
    };

    service.handleResponse(params).then(res => {
      expect(res.accessToken).toEqual('SlAV32hkKG');
      const expiresIn = Math.round((res.expiresAt!.getTime() - Date.now())/1000); 
      expect(expiresIn).toEqual(3600);
      expect(res.idToken).toEqual(token);
      expect(res.isLoggedIn).toBeTrue();
      expect(res.redirectPath).toBeUndefined();
      expect(res.userInfo).toEqual({sub: '1234567890'});
      done();
    }).catch(e => done.fail(e));

    const req = httpTestingController.expectOne(pc.tokenEndpoint);
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

  it("Handle Code Response Invalid Token", (done) => {
    const params: ResponseParams = {
      code: "123-123",
    };

    service.handleResponse(params).then(() => {
      done.fail('This should not work');
    }).catch(() => done());

    const req = httpTestingController.expectOne(pc.tokenEndpoint);
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

  it("Handle Code Response Wrong Signature", (done) => {
    const params: ResponseParams = {
      code: "123-123",
    };

    service.handleResponse(params).then(() => {
      done.fail('This should not work');
    }).catch(() => done());

    const req = httpTestingController.expectOne(pc.tokenEndpoint);
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

  it("Handle Code Response Validation Failed", (done) => {
    validator.validate = jasmine.createSpy('validate').and.throwError(new Error('Not valid'));
    const params: ResponseParams = {
      code: "123-123",
    };

    service.handleResponse(params).then(() => {
      done.fail('This should not work');
    }).catch(() => done());


    const req = httpTestingController.expectOne(pc.tokenEndpoint);
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

  it("Handle Code Response State", async () => {
    const params: ResponseParams = {
      code: "123-123",
      stateMessage: "tst",
      finalUrl: "http://xy"
    };


    service.handleResponse(params).then(res => {
      expect(res.redirectPath).toEqual("http://xy");
      expect(res.stateMessage).toEqual("tst");
    });

    const req = httpTestingController.expectOne(pc.tokenEndpoint);
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

  it("Handle Code Response TokenRequest failed", (done) => {
    const params: ResponseParams = {
      code: "123-123",
    };

    service.handleResponse(params).then(
      () => done.fail(new Error('This should not work')),
      (e: Error) => {
        expect(e.message).toEqual('Login failed: invalid_request')
        done();
      });

    const req = httpTestingController.expectOne(pc.tokenEndpoint);
    expect(req.request.method).toEqual('POST');
    expect(req.request.body.toString()).toEqual("client_id=id&grant_type=authorization_code&code=123-123&redirect_uri=https%3A%2F%2Fexample.com%2Frd")
    req.flush({error: "invalid_request"}, { status: 400, statusText: "Bad Request"});    
  });
});
