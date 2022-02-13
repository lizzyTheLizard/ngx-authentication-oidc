/*global localStorage*/

import { TestBed } from '@angular/core/testing';
import { LoginResult } from '../login-result';
import { TokenStoreToken } from './token-store';
import { TokenStoreWrapper } from './token-store-wrapper';

let service: TokenStoreWrapper;

describe('TokenStoreWrapper', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [],
      providers: [
        { provide: TokenStoreToken, useValue: localStorage },
        TokenStoreWrapper
      ]
    });
    service = TestBed.inject(TokenStoreWrapper);
  });

  it('Create', () => {
    expect(service).toBeTruthy();
  });

  it('Empty', () => {
    service.cleanTokenStore();
    expect(service.getLoginResult()).toEqual({
      isLoggedIn: false,
      accessToken: undefined,
      expiresAt: undefined,
      idToken: undefined,
      sessionState: undefined,
      userInfo: undefined,
      refreshToken: undefined
    });
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
