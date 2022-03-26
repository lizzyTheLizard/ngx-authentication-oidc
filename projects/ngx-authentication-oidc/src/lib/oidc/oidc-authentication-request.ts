/* global crypto*/
import { Inject, Injectable } from '@angular/core';
import { AuthConfigService } from '../auth-config.service';
import { WindowToken } from '../authentication-module.tokens';
import { LoginOptions, ResponseType } from '../configuration/login-options';
import { State } from '../helper/state';
import { TokenStoreWrapper } from '../helper/token-store-wrapper';

export const DEFAULT_SCOPE = 'openid profile email phone';
export const DEFAULT_FLOW = ResponseType.AUTH_CODE_FLOW;

const CODE_VERIFIER_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

@Injectable()
export class OidcAuthenticationRequest {
  constructor(
    private readonly config: AuthConfigService,
    private readonly tokenStore: TokenStoreWrapper,
    @Inject(WindowToken) private readonly window: Window
  ) {}

  public async generateRequest(loginOptions: LoginOptions, redirectUri: string): Promise<URL> {
    const nonce = this.createNonce();
    const codeVerifier = this.createCodeVerifier();
    const scope = this.generateStringFromScopes(loginOptions.scope) ?? DEFAULT_SCOPE;
    const responseType = loginOptions.response_type ?? DEFAULT_FLOW;
    const param: Map<string, string | undefined> = new Map();
    param.set('scope', scope);
    param.set('response_type', responseType.toString());
    param.set('client_id', this.config.clientId);
    param.set('redirect_uri', redirectUri);
    param.set('state', this.getState(loginOptions));
    param.set('nonce', nonce);
    param.set('display', loginOptions.display?.toString());
    param.set('prompt', this.generateStringFromScopes(loginOptions.prompts));
    param.set('max_age', loginOptions.max_age?.toString());
    param.set('ui_locales', this.generateStringFromScopes(loginOptions.ui_locales));
    param.set('id_token_hint', loginOptions.id_token_hint);
    param.set('login_hint', loginOptions.login_hint);
    param.set('acr_values', this.generateStringFromScopes(loginOptions.acr_values));
    param.set('code_challenge', await this.generateCodeChallenge(codeVerifier));
    param.set('code_challenge_method', 'S256');

    const url = new URL(this.config.getProviderConfiguration().authEndpoint);
    param.forEach((value, key) => {
      if (!value) {
        return;
      }
      url.searchParams.set(key, value);
    });
    return url;
  }

  private generateStringFromScopes(input?: string | string[]): string | undefined {
    if (!input) {
      return undefined;
    }
    if (typeof input == 'string') {
      return input;
    }
    return input.join(' ');
  }

  private getState(loginOptions: LoginOptions): string {
    const state: State = {
      finalRoute: loginOptions.finalRoute?.toString(),
      stateMessage: loginOptions.state
    };
    return JSON.stringify(state);
  }

  private createNonce(): string {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const nonce = array[0].toString();
    this.tokenStore.saveNonce(nonce);
    return nonce;
  }

  private createCodeVerifier(): string {
    let codeVerifier = '';
    const charactersLength = CODE_VERIFIER_CHARS.length;
    for (var i = 0; i < 127; i++) {
      codeVerifier += CODE_VERIFIER_CHARS.charAt(Math.floor(Math.random() * charactersLength));
    }
    this.tokenStore.saveCodeVerifier(codeVerifier);
    return codeVerifier;
  }

  private async generateCodeChallenge(codeVerifier: string): Promise<string> {
    const inputBuffer = new Uint8Array(codeVerifier.length);
    for (var i2 = 0, strLen = codeVerifier.length; i2 < strLen; i2++) {
      inputBuffer[i2] = codeVerifier.charCodeAt(i2);
    }
    const digest = await crypto.subtle.digest('SHA-256', inputBuffer);
    const str = String.fromCharCode(...new Uint8Array(digest));
    return this.window.btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
}
