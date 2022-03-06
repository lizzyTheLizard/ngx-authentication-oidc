import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthConfigService } from '../auth-config.service';
import { OauthConfig } from '../configuration/oauth-config';
import { LoginResult } from '../login-result';
import { Response } from '../helper/response-parameter-parser';
import { OidcCodeResponse } from './oidc-code-response';
import { OidcTokenResponse } from './oidc-token-response';

const config = {
  provider: {
    tokenEndpoint: 'http://xx'
  },
  clientId: 'id'
};

const redirectUrl = new URL('https://example.com/rd');

const params: Response = {
  code: '123-123'
};

const token =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';

const loginResult: LoginResult = {
  isLoggedIn: true,
  idToken: 'at',
  accessToken: 'id',
  userInfo: { sub: 'name' }
};

let tokenResponse: jasmine.SpyObj<OidcTokenResponse>;
let httpTestingController: HttpTestingController;
let service: OidcCodeResponse;

describe('OidcCodeResponse', () => {
  beforeEach(() => {
    const authConfig = new AuthConfigService(config as OauthConfig);
    tokenResponse = jasmine.createSpyObj('OidcTokenResponse', ['response', 'handleErrorResponse']);
    tokenResponse.response = jasmine
      .createSpy('response')
      .and.returnValue(Promise.resolve(loginResult));
    tokenResponse.handleErrorResponse = jasmine.createSpy('handleErrorResponse');

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: OidcTokenResponse, useValue: tokenResponse },
        { provide: AuthConfigService, useValue: authConfig },
        OidcCodeResponse
      ]
    });
    httpTestingController = TestBed.inject(HttpTestingController);
    service = TestBed.inject(OidcCodeResponse);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('Handle Error Response', (done) => {
    tokenResponse.handleErrorResponse = jasmine
      .createSpy('handleErrorResponse')
      .and.throwError(new Error('Login failed: not_possible'));
    const params: Response = {
      error: 'not_possible'
    };

    service.response(params, redirectUrl).then(
      () => done.fail(new Error('This should not work')),
      (e: Error) => {
        expect(e.message).toEqual('Login failed: not_possible');
        done();
      }
    );
  });

  it('Handle Code Response without code', (done) => {
    const params: Response = {
      finalUrl: 'test'
    };
    service.response(params, redirectUrl).then(
      () => done.fail(new Error('This should not work')),
      (e: Error) => {
        expect(e.message).toEqual('This is not a code response');
        done();
      }
    );
  });

  it('Handle Code Response makes token request', () => {
    service.response(params, redirectUrl);

    const req = httpTestingController.expectOne(config.provider.tokenEndpoint);
    expect(req.request.method).toEqual('POST');
    expect(req.request.body.toString()).toEqual(
      'client_id=id&grant_type=authorization_code&code=123-123&redirect_uri=https%3A%2F%2Fexample.com%2Frd'
    );
  });

  it('Handle Code Response calls TokenRequest', (done) => {
    tokenResponse.response.calls.reset();
    expect(tokenResponse.response).toHaveBeenCalledTimes(0);

    service
      .response(params, redirectUrl)
      .then((res) => {
        expect(res).toEqual({
          ...loginResult,
          redirectPath: params.finalUrl,
          stateMessage: params.stateMessage
        });
        expect(tokenResponse.response).toHaveBeenCalledTimes(1);
        expect(tokenResponse.response).toHaveBeenCalledWith({
          access_token: 'SlAV32hkKG',
          refresh_token: '8xLOxBtZp8',
          expires_in: '3600',
          id_token:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'
        });
        done();
      })
      .catch((e) => done.fail(e));

    const req = httpTestingController.expectOne(config.provider.tokenEndpoint);
    req.flush({
      access_token: 'SlAV32hkKG',
      token_type: 'Bearer',
      refresh_token: '8xLOxBtZp8',
      expires_in: 3600,
      id_token: token
    });
  });
});
