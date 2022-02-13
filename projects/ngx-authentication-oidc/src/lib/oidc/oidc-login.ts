import { Inject, Injectable } from '@angular/core';
import { AuthConfigService } from '../auth-config.service';
import { LoggerFactoryToken } from '../logger/logger';
import { LoginOptions } from '../configuration/login-options';
import { Logger, LoggerFactory } from '../logger/logger';
import { LoginResult } from '../login-result';
import { WindowToken } from '../authentication-module.tokens';
import { AuthenticationRequest } from './helper/authentication-request';

@Injectable()
export class OidcLogin {
  private readonly logger: Logger;

  constructor(
    private readonly config: AuthConfigService,
    @Inject(WindowToken) private readonly window: Window,
    @Inject(LoggerFactoryToken) loggerFactory: LoggerFactory
  ) {
    this.logger = loggerFactory('OidcLogin');
  }

  public async login(loginOptions: LoginOptions): Promise<LoginResult> {
    console.info('Perform login');
    const redirectUri = this.config.client.redirectUri;
    const clientId = this.config.client.clientId;
    const authEndpoint = this.config.getProviderConfiguration().authEndpoint;
    const url = new AuthenticationRequest(
      loginOptions,
      redirectUri,
      clientId,
      authEndpoint
    ).toUrl();
    this.logger.info('Start a login request to', url);
    this.window.location.href = url.toString();
    return new Promise<LoginResult>((_, reject) =>
      this.window.setTimeout(() => reject('Browser should be redirected'), 1000)
    );
  }
}
