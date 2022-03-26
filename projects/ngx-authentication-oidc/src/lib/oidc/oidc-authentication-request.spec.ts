/* globals window */
import { TestBed } from '@angular/core/testing';
import { AuthConfigService } from '../auth-config.service';
import { WindowToken } from '../authentication-module.tokens';
import { LoginOptions, Prompt, ResponseType } from '../configuration/login-options';
import { OauthConfig } from '../configuration/oauth-config';
import { TokenStoreWrapper } from '../helper/token-store-wrapper';
import { DEFAULT_SCOPE, OidcAuthenticationRequest } from './oidc-authentication-request';

const config = {
  provider: {
    authEndpoint: 'https://example.com/auth'
  },
  clientId: 'id'
};

const windowMock = {
  btoa: (str: string) => window.btoa(str)
};

let tokenStoreWrapper: TokenStoreWrapper;
let service: OidcAuthenticationRequest;

describe('OidcAuthenticationRequest', () => {
  beforeEach(() => {
    const authConfig = new AuthConfigService(config as OauthConfig);

    tokenStoreWrapper = jasmine.createSpyObj('TokenStoreWrapper', [
      'saveNonce',
      'saveCodeVerifier'
    ]);

    TestBed.configureTestingModule({
      imports: [],
      providers: [
        { provide: WindowToken, useFactory: () => windowMock },
        { provide: AuthConfigService, useValue: authConfig },
        { provide: TokenStoreWrapper, useValue: tokenStoreWrapper },
        OidcAuthenticationRequest
      ]
    });

    service = TestBed.inject(OidcAuthenticationRequest);
  });

  it('Create Auth Request default params', async () => {
    const loginOptions = { response_type: ResponseType.AUTH_CODE_FLOW };
    const result = await service.generateRequest(loginOptions, 'https://example.com/rd');

    expect(result.pathname).toEqual('/auth');
    expect(result.searchParams.get('response_type')).toEqual('code');
    expect(result.searchParams.get('scope')).toEqual(DEFAULT_SCOPE);
    expect(result.searchParams.get('client_id')).toEqual('id');
    expect(JSON.parse(result.searchParams.get('state')!)).toEqual({});
    expect(result.searchParams.get('redirect_uri')).toEqual('https://example.com/rd');
    expect(result.searchParams.has('nonce')).toBeTrue();
    expect(result.searchParams.has('code_challenge')).toBeTrue();
    expect(result.searchParams.has('code_challenge_method')).toBeTrue();
  });

  it('Create Auth Request special params', async () => {
    const loginOptions: LoginOptions = {
      finalRoute: '/final',
      scope: ['openid', 'profile', 'email'],
      prompts: Prompt.NONE,
      ui_locales: 'de',
      response_type: ResponseType.IMPLICIT_FLOW_TOKEN,
      login_hint: 'hint',
      id_token_hint: 'id_hint',
      acr_values: 'acr'
    };
    const result = await service.generateRequest(loginOptions, 'https://example.com/rd222');

    expect(result.pathname).toEqual('/auth');
    expect(result.searchParams.get('response_type')).toEqual('id_token token');
    expect(result.searchParams.get('scope')).toEqual('openid profile email');
    expect(result.searchParams.get('client_id')).toEqual('id');
    expect(JSON.parse(result.searchParams.get('state')!)).toEqual({
      finalRoute: '/final'
    });
    expect(result.searchParams.get('redirect_uri')).toEqual('https://example.com/rd222');
    expect(result.searchParams.has('nonce')).toBeTrue();
    expect(result.searchParams.get('prompt')).toEqual('none');
    expect(result.searchParams.get('ui_locales')).toEqual('de');
    expect(result.searchParams.get('login_hint')).toEqual('hint');
    expect(result.searchParams.get('id_token_hint')).toEqual('id_hint');
    expect(result.searchParams.get('acr_values')).toEqual('acr');
  });

  it('nonce', async () => {
    const loginOptions = { response_type: ResponseType.AUTH_CODE_FLOW };
    const result = await service.generateRequest(loginOptions, 'https://example.com/rd222');

    expect(tokenStoreWrapper.saveNonce).toHaveBeenCalledTimes(1);
    expect(tokenStoreWrapper.saveNonce).toHaveBeenCalledWith(result.searchParams.get('nonce')!);
  });

  it('codeVerifier', async () => {
    const loginOptions = { response_type: ResponseType.AUTH_CODE_FLOW };
    await service.generateRequest(loginOptions, 'https://example.com/rd222');

    expect(tokenStoreWrapper.saveCodeVerifier).toHaveBeenCalledTimes(1);
  });
});
