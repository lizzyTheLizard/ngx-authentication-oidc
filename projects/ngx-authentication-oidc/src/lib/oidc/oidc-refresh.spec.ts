import { TestBed } from '@angular/core/testing';
import { LoggerFactoryToken } from '../logger/logger';
import { OauthConfig, ProviderConfig } from '../configuration/oauth-config';
import { OidcRefresh } from './oidc-refresh';
import { OidcResponse } from './oidc-response';
import {
  HttpClientTestingModule,
  HttpTestingController
} from '@angular/common/http/testing';
import { LoginResult } from '../login-result';
import { AuthConfigService } from '../auth-config.service';

const config = {
  silentLoginTimeoutInSecond: 1,
  client: { clientId: 'id' },
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

const oidcResponse = jasmine.createSpyObj('oidcResponse', [
  'handleURLResponse'
]);

let httpTestingController: HttpTestingController;
let service: OidcRefresh;

describe('OidcRefresh', () => {
  beforeEach(() => {
    const authConfig = new AuthConfigService(config as OauthConfig);
    authConfig.setProviderConfiguration(config.provider as ProviderConfig);
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: LoggerFactoryToken, useValue: () => console },
        { provide: AuthConfigService, useValue: authConfig },
        { provide: OidcResponse, useValue: oidcResponse },
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
    oidcResponse.handleResponse = jasmine
      .createSpy('handleResponse')
      .and.returnValue({ isLoggedIn: false });
    service.tokenRefresh(oldLoginResult).then(
      () => {
        expect(oidcResponse.handleResponse).toHaveBeenCalledWith({
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
    oidcResponse.handleResponse = jasmine
      .createSpy('handleResponse')
      .and.returnValue(newLoginResult);
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
