import { Inject, Injectable } from "@angular/core";
import { AuthConfigService } from "../auth-config.service";
import { LoggerFactoryToken, WindowToken } from "../authentication-module";
import { LoginOptions, ResponseType } from "../configuration/login-options";
import { Logger, LoggerFactory } from "../logger/logger";
import { LoginResult } from "../login-result";

export interface State {
  stateMessage?: string;
  finalUrl?: string;
}

interface RequestParams extends State {
    authEndpoint: string | URL;
    clientId: string;
    redirectUri: string;
    response_type?: string;
    scope?: string[];
    prompt?: string;
    ui_locales?: string;
    id_token_hint?: string;
    login_hint?: string;
    acr_values?: string;
    nonce?: string;
  }
  
@Injectable()
export class OidcLogin {
  private readonly logger: Logger;

  constructor(
      private readonly config: AuthConfigService,
      @Inject(WindowToken) private readonly window: Window,
      @Inject(LoggerFactoryToken) loggerFactory: LoggerFactory){
    this.logger = loggerFactory('OidcLogin');
  }

  public async login(loginOptions: LoginOptions): Promise<LoginResult> {
    const redirectUri = this.config.client.redirectUri
    const url = this.createAuthenticationRequest(loginOptions, redirectUri);
    this.logger.info('Start a login request to', url);
    this.window.location.href = url.toString();
    return new Promise<LoginResult>((_, reject) => setTimeout(() => reject("Browser should be redirected"), 1000));
  }
    
  public createAuthenticationRequest(loginOptions: LoginOptions, redirectUri: string): URL {
    const requestParams: RequestParams = {
      ...loginOptions,
      authEndpoint: this.config.getProviderConfiguration().authEndpoint,
      clientId: this.config.client.clientId,
      nonce: this.createNonce(),
      redirectUri: redirectUri,
    };
    const url = new URL(requestParams.authEndpoint);
    const state: State = {stateMessage: requestParams.stateMessage, finalUrl: requestParams.finalUrl};
    url.searchParams.append("response_type", requestParams.response_type ?? ResponseType.AUTH_CODE_FLOE );
    url.searchParams.append("scope", requestParams.scope?.join(" ") ?? "openid profile");
    url.searchParams.append("client_id", requestParams.clientId);
    url.searchParams.append("state", JSON.stringify(state));
    url.searchParams.append("redirect_uri", requestParams.redirectUri);
    if(requestParams.nonce) {
      url.searchParams.append("nonce", requestParams.nonce);
    }
    if(requestParams.prompt) {
      url.searchParams.append("prompt", requestParams.prompt);
    }
    if(requestParams.ui_locales) {
      url.searchParams.append("ui_locales", requestParams.ui_locales);
    }
    if(requestParams.id_token_hint) {
      url.searchParams.append("id_token_hint", requestParams.id_token_hint);
    }
    if(requestParams.login_hint) {
      url.searchParams.append("login_hint", requestParams.login_hint);
    }
    if(requestParams.acr_values) {
      url.searchParams.append("acr_values", requestParams.acr_values);
    }
    return url;
  }
    
  private createNonce(): string {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const nonce = array[0].toString();
    return nonce;
  }
}
