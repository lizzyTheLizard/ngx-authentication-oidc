import { Inject, Injectable } from '@angular/core';
import { AuthConfigService } from '../auth-config.service';
import { LoggerFactoryToken } from '../logger/logger';
import { Logger, LoggerFactory } from '../logger/logger';

@Injectable()
export class OidcLogout {
  private readonly logger: Logger;

  constructor(
    private readonly config: AuthConfigService,
    @Inject(LoggerFactoryToken) loggerFactory: LoggerFactory
  ) {
    this.logger = loggerFactory('OidcLogout');
  }

  //TODO:  RP-Initiated Logout (https://openid.net/specs/openid-connect-rpinitiated-1_0.html)
  public async logout() {
    //Nothing to do here
  }
}
