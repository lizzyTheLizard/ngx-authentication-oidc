/* global crypto*/
import { LoginOptions, ResponseType } from '../configuration/login-options';
import { State } from './state';

export const DEFAULT_SCOPE = 'openid profile email phone';
export const DEFAULT_FLOW = ResponseType.AUTH_CODE_FLOW;

export class AuthenticationRequest {
  public readonly nonce: string;
  constructor(
    private readonly loginOptions: LoginOptions,
    private readonly redirectUri: string,
    private readonly clientId: string,
    private readonly authEndpoint: string
  ) {
    this.nonce = this.createNonce();
  }

  public toString(): string {
    return this.toUrl().toString();
  }

  public toUrl(): URL {
    const scope = this.generateString(this.loginOptions.scope) ?? DEFAULT_SCOPE;
    const responseType = this.loginOptions.response_type ?? DEFAULT_FLOW;
    const param: Map<string, string | undefined> = new Map();
    param.set('scope', scope);
    param.set('response_type', responseType.toString());
    param.set('client_id', this.clientId);
    param.set('redirect_uri', this.redirectUri);
    param.set('state', this.getState());
    param.set('nonce', this.nonce);
    param.set('display', this.loginOptions.display?.toString());
    param.set('prompt', this.generateString(this.loginOptions.prompts));
    param.set('max_age', this.loginOptions.max_age?.toString());
    param.set('ui_locales', this.generateString(this.loginOptions.ui_locales));
    param.set('id_token_hint', this.loginOptions.id_token_hint);
    param.set('login_hint', this.loginOptions.login_hint);
    param.set('acr_values', this.generateString(this.loginOptions.acr_values));

    const url = new URL(this.authEndpoint);
    param.forEach((value, key) => {
      if (!value) {
        return;
      }
      url.searchParams.set(key, value);
    });
    return url;
  }

  private generateString(input?: string | string[]): string | undefined {
    if (!input) {
      return undefined;
    }
    if (typeof input == 'string') {
      return input;
    }
    return input.join(' ');
  }

  private getState(): string {
    const state: State = {
      finalUrl: this.loginOptions.finalUrl?.toString(),
      stateMessage: this.loginOptions.state
    };
    return JSON.stringify(state);
  }

  private createNonce(): string {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const nonce = array[0].toString();
    return nonce;
  }
}
