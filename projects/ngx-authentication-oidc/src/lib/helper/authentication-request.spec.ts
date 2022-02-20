// eslint-disable-next-line prettier/prettier
import { LoginOptions, Prompt, ResponseType } from '../configuration/login-options';
import { AuthenticationRequest, DEFAULT_SCOPE } from './authentication-request';

describe('AuthenticationRequest', () => {
  it('Create Auth Request default params', () => {
    const loginOptions = {};
    const result = new AuthenticationRequest(
      loginOptions,
      'https://example.com/rd',
      'id',
      'https://example.com/auth'
    ).toUrl();

    expect(result.pathname).toEqual('/auth');
    expect(result.searchParams.get('response_type')).toEqual('code');
    expect(result.searchParams.get('scope')).toEqual(DEFAULT_SCOPE);
    expect(result.searchParams.get('client_id')).toEqual('id');
    expect(JSON.parse(result.searchParams.get('state')!)).toEqual({});
    expect(result.searchParams.get('redirect_uri')).toEqual('https://example.com/rd');
    expect(result.searchParams.has('nonce')).toBeTrue();
  });

  it('Create Auth Request special params', () => {
    const loginOptions: LoginOptions = {
      finalUrl: 'https://example.com/final',
      scope: ['openid', 'profile', 'email'],
      prompts: Prompt.NONE,
      ui_locales: 'de',
      response_type: ResponseType.IMPLICIT_FLOW_TOKEN,
      login_hint: 'hint',
      id_token_hint: 'id_hint',
      acr_values: 'acr'
    };
    const result = new AuthenticationRequest(
      loginOptions,
      'https://example.com/rd222',
      'id',
      'https://example.com/auth'
    ).toUrl();

    expect(result.pathname).toEqual('/auth');
    expect(result.searchParams.get('response_type')).toEqual('id_token token');
    expect(result.searchParams.get('scope')).toEqual('openid profile email');
    expect(result.searchParams.get('client_id')).toEqual('id');
    expect(JSON.parse(result.searchParams.get('state')!)).toEqual({
      finalUrl: 'https://example.com/final'
    });
    expect(result.searchParams.get('redirect_uri')).toEqual('https://example.com/rd222');
    expect(result.searchParams.has('nonce')).toBeTrue();
    expect(result.searchParams.get('prompt')).toEqual('none');
    expect(result.searchParams.get('ui_locales')).toEqual('de');
    expect(result.searchParams.get('login_hint')).toEqual('hint');
    expect(result.searchParams.get('id_token_hint')).toEqual('id_hint');
    expect(result.searchParams.get('acr_values')).toEqual('acr');
  });
});
