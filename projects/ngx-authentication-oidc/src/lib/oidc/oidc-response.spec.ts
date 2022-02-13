// eslint-disable-next-line prettier/prettier
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthConfigService } from '../auth-config.service';
import { LoggerFactoryToken } from '../logger/logger';
import { OauthConfig, ProviderConfig } from '../configuration/oauth-config';
import { OidcResponse, ResponseParams } from './oidc-response';
import { OidcTokenValidator } from './oidc-token-validator';
import { WindowToken } from '../authentication-module.tokens';

const config = {
  provider: {
    authEndpoint: 'http://xx',
    tokenEndpoint: 'http://xx',
    issuer: 'http://xx',
    alg: ['HS256'],
    publicKeys: [],
    maxAge: 10000
  },
  client: {
    redirectUri: 'https://example.com/rd',
    clientId: 'id'
  }
};

const token =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';

const windowMock = {
  addEventListener: jasmine.createSpy('addEventListener'),
  removeEventListener: jasmine.createSpy('removeEventListener '),
  location: { href: 'http://localhost', origin: 'http://localhost' }
};

let httpTestingController: HttpTestingController;
let service: OidcResponse;
let validator: OidcTokenValidator;

describe('OidcResponse', () => {
  beforeEach(() => {
    const authConfig = new AuthConfigService(config as OauthConfig);
    authConfig.setProviderConfiguration(config.provider as ProviderConfig);
    validator = jasmine.createSpyObj('OidcTokenValidator', ['verify']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: WindowToken, useFactory: () => windowMock },
        { provide: LoggerFactoryToken, useValue: () => console },
        { provide: OidcTokenValidator, useValue: validator },
        { provide: AuthConfigService, useValue: authConfig },
        OidcResponse
      ]
    });
    httpTestingController = TestBed.inject(HttpTestingController);
    service = TestBed.inject(OidcResponse);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('Handle Implicit Response', async () => {
    validator.verify = jasmine
      .createSpy('validate')
      .and.returnValue({ sub: '1234567890' });
    const params: ResponseParams = {
      stateMessage: 'af0ifjsldkj',
      expires_in: '3600',
      id_token: token,
      access_token: 'SlAV32hkKG'
    };

    const res = await service.handleResponse(params);

    expect(res.accessToken).toEqual('SlAV32hkKG');
    const expiresIn = Math.round(
      (res.expiresAt!.getTime() - Date.now()) / 1000
    );
    expect(expiresIn).toEqual(3600);
    expect(res.idToken).toEqual(token);
    expect(res.isLoggedIn).toBeTrue();
    expect(res.redirectPath).toBeUndefined();
    expect(res.userInfo).toEqual({ sub: '1234567890' });
  });

  it('Handle Implicit Response State', async () => {
    const params: ResponseParams = {
      stateMessage: 'tst',
      finalUrl: 'http://xy',
      expires_in: '3600',
      id_token: token,
      access_token: 'SlAV32hkKG'
    };
    const res = await service.handleResponse(params);

    expect(res.redirectPath).toEqual('http://xy');
    expect(res.stateMessage).toEqual('tst');
  });

  it('Handle Error Response', (done) => {
    const params: ResponseParams = {
      error: 'not_possible'
    };

    service.handleResponse(params).then(
      () => done.fail(new Error('This should not work')),
      (e: Error) => {
        expect(e.message).toEqual('Login failed: not_possible');
        done();
      }
    );
  });

  it('Handle Hybrid Response', (done) => {
    const params: ResponseParams = {
      code: '1234',
      access_token: '123123'
    };

    service.handleResponse(params).then(
      () => done.fail(new Error('This should not work')),
      (e: Error) => {
        expect(e.message).toEqual('Login failed: Hybrid Flow not supported');
        done();
      }
    );
  });

  it('Handle Code Response', (done) => {
    validator.verify = jasmine
      .createSpy('validate')
      .and.returnValue({ sub: '1234567890' });
    const params: ResponseParams = {
      code: '123-123'
    };

    service
      .handleResponse(params)
      .then((res) => {
        expect(res.accessToken).toEqual('SlAV32hkKG');
        const expiresIn = Math.round(
          (res.expiresAt!.getTime() - Date.now()) / 1000
        );
        expect(expiresIn).toEqual(3600);
        expect(res.idToken).toEqual(token);
        expect(res.isLoggedIn).toBeTrue();
        expect(res.redirectPath).toBeUndefined();
        expect(res.userInfo).toEqual({ sub: '1234567890' });
        done();
      })
      .catch((e) => done.fail(e));

    const req = httpTestingController.expectOne(config.provider.tokenEndpoint);
    expect(req.request.method).toEqual('POST');
    expect(req.request.body.toString()).toEqual(
      'client_id=id&grant_type=authorization_code&code=123-123&redirect_uri=https%3A%2F%2Fexample.com%2Frd'
    );
    req.flush({
      access_token: 'SlAV32hkKG',
      token_type: 'Bearer',
      refresh_token: '8xLOxBtZp8',
      expires_in: 3600,
      id_token: token
    });
  });

  it('Handle Code Response Invalid Token', (done) => {
    validator.verify = jasmine
      .createSpy('validate')
      .and.throwError(new Error('Not valid'));
    const params: ResponseParams = {
      code: '123-123'
    };

    service
      .handleResponse(params)
      .then(() => {
        done.fail('This should not work');
      })
      .catch(() => done());

    const req = httpTestingController.expectOne(config.provider.tokenEndpoint);
    expect(req.request.method).toEqual('POST');
    expect(req.request.body.toString()).toEqual(
      'client_id=id&grant_type=authorization_code&code=123-123&redirect_uri=https%3A%2F%2Fexample.com%2Frd'
    );
    req.flush({
      access_token: 'SlAV32hkKG',
      token_type: 'Bearer',
      refresh_token: '8xLOxBtZp8',
      expires_in: 3600,
      id_token: 'invalid'
    });
  });

  it('Handle Code Response State', async () => {
    const params: ResponseParams = {
      code: '123-123',
      stateMessage: 'tst',
      finalUrl: 'http://xy'
    };

    service.handleResponse(params).then((res) => {
      expect(res.redirectPath).toEqual('http://xy');
      expect(res.stateMessage).toEqual('tst');
    });

    const req = httpTestingController.expectOne(config.provider.tokenEndpoint);
    expect(req.request.method).toEqual('POST');
    expect(req.request.body.toString()).toEqual(
      'client_id=id&grant_type=authorization_code&code=123-123&redirect_uri=https%3A%2F%2Fexample.com%2Frd'
    );
    req.flush({
      access_token: 'SlAV32hkKG',
      token_type: 'Bearer',
      refresh_token: '8xLOxBtZp8',
      expires_in: 3600,
      id_token: token
    });
  });

  it('Handle Code Response TokenRequest failed', (done) => {
    const params: ResponseParams = {
      code: '123-123'
    };

    service.handleResponse(params).then(
      () => done.fail(new Error('This should not work')),
      (e: Error) => {
        expect(e.message).toEqual('Login failed: invalid_request');
        done();
      }
    );

    const req = httpTestingController.expectOne(config.provider.tokenEndpoint);
    expect(req.request.method).toEqual('POST');
    expect(req.request.body.toString()).toEqual(
      'client_id=id&grant_type=authorization_code&code=123-123&redirect_uri=https%3A%2F%2Fexample.com%2Frd'
    );
    req.flush(
      { error: 'invalid_request' },
      { status: 400, statusText: 'Bad Request' }
    );
  });
});
