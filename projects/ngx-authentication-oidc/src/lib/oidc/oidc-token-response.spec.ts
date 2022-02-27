import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthConfigService } from '../auth-config.service';
import { OauthConfig, UserInfoSource } from '../configuration/oauth-config';
import { Response } from '../helper/response-parameter-parser';
import { TokenStoreWrapper } from '../helper/token-store-wrapper';
import { OidcTokenResponse } from './oidc-token-response';
import { OidcTokenValidator } from './oidc-token-validator';

const config = {
  provider: {
    authEndpoint: 'http://xx',
    tokenEndpoint: 'http://xx',
    issuer: 'http://xx',
    alg: ['HS256'],
    publicKeys: [],
    maxAge: 10000
  },
  redirectUri: 'https://example.com/rd',
  clientId: 'id',
  userInfoSource: UserInfoSource.TOKEN
};

const token =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';

let httpTestingController: HttpTestingController;
let service: OidcTokenResponse;
let validator: OidcTokenValidator;

describe('OidcTokenResponse', () => {
  beforeEach(() => {
    const authConfig = new AuthConfigService(config as OauthConfig);
    validator = jasmine.createSpyObj('OidcTokenValidator', ['verify']);

    const tokenStoreWrapper = jasmine.createSpyObj('TokenStoreWrapper', ['getStoredNonce']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: OidcTokenValidator, useValue: validator },
        { provide: AuthConfigService, useValue: authConfig },
        { provide: TokenStoreWrapper, useValue: tokenStoreWrapper },
        OidcTokenResponse
      ]
    });
    httpTestingController = TestBed.inject(HttpTestingController);
    service = TestBed.inject(OidcTokenResponse);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('Handle Implicit Response', async () => {
    validator.verify = jasmine.createSpy('validate').and.returnValue({ sub: '1234567890' });
    const params: Response = {
      stateMessage: 'af0ifjsldkj',
      expires_in: '3600',
      id_token: token,
      access_token: 'SlAV32hkKG'
    };

    const res = await service.response(params);

    expect(res.accessToken).toEqual('SlAV32hkKG');
    const expiresIn = Math.round((res.expiresAt!.getTime() - Date.now()) / 1000);
    expect(expiresIn).toEqual(3600);
    expect(res.idToken).toEqual(token);
    expect(res.isLoggedIn).toBeTrue();
    expect(res.redirectPath).toBeUndefined();
    expect(res.userInfo).toEqual({ sub: '1234567890' });
  });

  it('Handle Implicit Response State', async () => {
    validator.verify = jasmine.createSpy('validate').and.returnValue({ sub: '1234567890' });
    const params: Response = {
      stateMessage: 'tst',
      finalUrl: 'http://xy',
      expires_in: '3600',
      id_token: token,
      access_token: 'SlAV32hkKG'
    };

    const res = await service.response(params);

    expect(res.redirectPath).toEqual('http://xy');
    expect(res.stateMessage).toEqual('tst');
  });

  it('Handle Error Response', (done) => {
    const params: Response = {
      error: 'not_possible'
    };

    service.response(params).then(
      () => done.fail(new Error('This should not work')),
      (e: Error) => {
        expect(e.message).toEqual('Login failed: not_possible');
        done();
      }
    );
  });
});
