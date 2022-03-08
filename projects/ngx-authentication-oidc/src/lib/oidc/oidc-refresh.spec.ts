// eslint-disable-next-line prettier/prettier
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { OidcRefresh } from './oidc-refresh';
import { LoginResult } from '../login-result';
import { AuthConfigService } from '../auth-config.service';
import { OidcTokenResponse } from './oidc-token-response';

const config = {
  silentLoginTimeoutInSecond: 1,
  clientId: 'id',
  provider: {
    tokenEndpoint: 'https://example.com/token'
  }
};

const oldLoginResult: LoginResult = {
  isLoggedIn: true,
  idToken: 'id',
  refreshToken: 'RT',
  sessionState: 'SS'
};

const oidcTokenResponse = jasmine.createSpyObj('oidcTokenResponse', ['response']);

let httpTestingController: HttpTestingController;
let service: OidcRefresh;

describe('OidcRefresh', () => {
  beforeEach(() => {
    const authConfig = new AuthConfigService(config as any);
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: AuthConfigService, useValue: authConfig },
        { provide: OidcTokenResponse, useValue: oidcTokenResponse },
        OidcRefresh
      ]
    });
    service = TestBed.inject(OidcRefresh);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  it('Correct Http Call', (done) => {
    service
      .tokenRefresh(oldLoginResult)
      .catch(() => {})
      .then(() => done());

    const req = httpTestingController.expectOne(config.provider.tokenEndpoint);
    expect(req.request.method).toEqual('POST');
    expect(req.request.body.toString()).toEqual(
      'client_id=id&grant_type=refresh_token&refresh_token=RT'
    );
    req.flush({});
  });

  it('Merge with old Session', (done) => {
    oidcTokenResponse.response = jasmine
      .createSpy('response')
      .and.returnValue({ isLoggedIn: false });
    service.tokenRefresh(oldLoginResult).then(
      () => {
        expect(oidcTokenResponse.response).toHaveBeenCalledWith(false, {
          expires_in: 3600,
          id_token: 'id2',
          access_token: 'at2',
          refresh_token: 'RT',
          session_state: 'SS'
        });
        done();
      },
      (e) => done.fail(e)
    );

    const req = httpTestingController.expectOne(config.provider.tokenEndpoint);
    req.flush({
      expires_in: 3600,
      id_token: 'id2',
      access_token: 'at2'
    });
  });

  it('Return values', (done) => {
    const newLoginResult: LoginResult = {
      isLoggedIn: true,
      idToken: 'ud2',
      userInfo: { sub: '123' }
    };
    oidcTokenResponse.response = jasmine.createSpy('response').and.returnValue(newLoginResult);
    service.tokenRefresh(oldLoginResult).then(
      (res) => {
        expect(res).toEqual(newLoginResult);
        done();
      },
      (e) => done.fail(e)
    );

    const req = httpTestingController.expectOne(config.provider.tokenEndpoint);
    req.flush({});
  });
});
