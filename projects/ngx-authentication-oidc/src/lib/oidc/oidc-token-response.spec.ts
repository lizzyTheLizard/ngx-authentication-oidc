import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
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
    userInfoEndpoint: 'http://xx/ui',
    issuer: 'http://xx',
    alg: ['HS256'],
    publicKeys: [],
    maxAge: 10000
  },
  redirectUri: 'https://example.com/rd',
  clientId: 'id',
  userInfoSource: UserInfoSource.TOKEN_THEN_USER_INFO_ENDPOINT
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

  it('Handle Token Response', async () => {
    validator.verify = jasmine.createSpy('validate').and.returnValue({ sub: '1234567890' });
    const params: Response = {
      stateMessage: 'af0ifjsldkj',
      expires_in: '3600',
      id_token: token,
      access_token: 'SlAV32hkKG'
    };

    const res = await service.response(false, params);

    expect(res.accessToken).toEqual('SlAV32hkKG');
    const expiresIn = Math.round((res.expiresAt!.getTime() - Date.now()) / 1000);
    expect(expiresIn).toEqual(3600);
    expect(res.idToken).toEqual(token);
    expect(res.isLoggedIn).toBeTrue();
    expect(res.finalRoute).toBeUndefined();
    expect(res.userInfo).toEqual({ sub: '1234567890' });
  });

  it('Handle Token Response State', async () => {
    validator.verify = jasmine.createSpy('validate').and.returnValue({ sub: '1234567890' });
    const params: Response = {
      stateMessage: 'tst',
      finalRoute: '/final',
      expires_in: '3600',
      id_token: token,
      access_token: 'SlAV32hkKG'
    };

    const res = await service.response(false, params);

    expect(res.finalRoute).toEqual('/final');
    expect(res.stateMessage).toEqual('tst');
  });

  it('Handle UserInfo Response', fakeAsync(async () => {
    validator.verify = jasmine.createSpy('validate').and.returnValue({ sub: '1234567890' });
    const params: Response = {
      stateMessage: 'tst',
      finalRoute: '/final',
      expires_in: '3600',
      access_token: 'SlAV32hkKG'
    };

    const promise = service.response(false, params);
    tick(10);

    const req = httpTestingController.expectOne(config.provider.userInfoEndpoint);
    expect(req.request.method).toEqual('POST');
    req.flush({
      sub: '1234567890'
    });

    const res = await promise;

    expect(res.accessToken).toEqual('SlAV32hkKG');
    const expiresIn = Math.round((res.expiresAt!.getTime() - Date.now()) / 1000);
    expect(expiresIn).toEqual(3600);
    expect(res.idToken).toBeUndefined();
    expect(res.isLoggedIn).toBeTrue();
    expect(res.finalRoute).toEqual(params.finalRoute);
    expect(res.userInfo).toEqual({ sub: '1234567890' });
  }));

  it('Handle Error Response', (done) => {
    const params: Response = {
      error: 'not_possible',
      error_description: 'desc',
      error_uri: 'uri'
    };

    service.response(false, params).then(
      () => done.fail(new Error('This should not work')),
      (e: Error) => {
        expect(e.message).toEqual('Login failed: not_possible');
        done();
      }
    );
  });

  it('Handle Non Token Response', (done) => {
    const params: Response = {
      code: 'asd'
    };

    service.response(false, params).then(
      () => done.fail(new Error('This should not work')),
      (e: Error) => {
        expect(e.message).toEqual('This is not a token response');
        done();
      }
    );
  });
});
