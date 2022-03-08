import { TestBed } from '@angular/core/testing';
import { AuthConfigService } from '../auth-config.service';
import { OauthConfig } from '../configuration/oauth-config';
import { LoginResult } from '../login-result';
import { TokenStoreWrapper } from './token-store-wrapper';

let service: TokenStoreWrapper;

describe('TokenStoreWrapper', () => {
  beforeEach(() => {
    const configService = new AuthConfigService({} as OauthConfig);
    TestBed.configureTestingModule({
      providers: [{ provide: AuthConfigService, useValue: configService }, TokenStoreWrapper]
    });
    service = TestBed.inject(TokenStoreWrapper);
  });

  it('Create', () => {
    expect(service).toBeTruthy();
  });

  it('Empty', () => {
    service.cleanTokenStore();
    expect(service.getLoginResult()).toEqual({
      isLoggedIn: false
    });
  });

  it('Nonce', () => {
    service.saveNonce('nonce');
    expect(service.getStoredNonce()).toEqual('nonce');
  });

  it('CodeVerifier', () => {
    service.saveCodeVerifier('verifier');
    expect(service.getStoredVerifier()).toEqual('verifier');
  });

  it('Store and reset', () => {
    const loginResult: LoginResult = {
      isLoggedIn: true,
      accessToken: 'at',
      expiresAt: new Date('2020-01-01T10:39Z'),
      idToken: 'it',
      sessionState: 'ss',
      userInfo: { sub: 'name' },
      refreshToken: 'rt'
    };
    service.setLoginResult(loginResult);
    expect(service.getLoginResult()).toEqual(loginResult);
  });
});
