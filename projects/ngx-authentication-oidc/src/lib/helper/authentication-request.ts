/* global crypto*/
import { LoginOptions, ResponseType } from '../configuration/login-options';
import { State } from './state';

export const DEFAULT_SCOPE = 'openid profile email phone';
export const DEFAULT_FLOW = ResponseType.AUTH_CODE_FLOW;

const CODE_VERIFIER_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export class AuthenticationRequest {
  public readonly nonce: string;
  public readonly codeVerifier: string;
  constructor(
    private readonly loginOptions: LoginOptions,
    private readonly redirectUri: string,
    private readonly clientId: string,
    private readonly authEndpoint: string,
    private readonly window: Window
  ) {
    this.nonce = this.createNonce();
    this.codeVerifier = this.createCodeVerifier();
  }

  public async toString(): Promise<string> {
    const url = await this.toUrl();
    return url.toString();
  }

  public async toUrl(): Promise<URL> {
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
    param.set('code_challenge', await this.generateCodeChallenge());
    param.set('code_challenge_method', 'S256');

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
      finalRoute: this.loginOptions.finalRoute?.toString(),
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

  private createCodeVerifier(): string {
    let result = '';
    const charactersLength = CODE_VERIFIER_CHARS.length;
    for (var i = 0; i < 127; i++) {
      result += CODE_VERIFIER_CHARS.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  private async generateCodeChallenge(): Promise<string> {
    const inputBuffer = new Uint8Array(this.codeVerifier.length);
    for (var i2 = 0, strLen = this.codeVerifier.length; i2 < strLen; i2++) {
      inputBuffer[i2] = this.codeVerifier.charCodeAt(i2);
    }
    const digest = await crypto.subtle.digest('SHA-256', inputBuffer);
    const str = String.fromCharCode(...new Uint8Array(digest));
    return this.window.btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
}
