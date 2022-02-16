import { Injectable } from '@angular/core';
import { AuthConfigService } from '../auth-config.service';
import { Logger } from '../configuration/oauth-config';

@Injectable()
export class OidcLogout {
  private readonly logger: Logger;

  constructor(private readonly config: AuthConfigService) {
    this.logger = this.config.loggerFactory('OidcLogout');
  }

  // TODO:  RP-Initiated Logout (https://openid.net/specs/openid-connect-rpinitiated-1_0.html)
  public async logout() {
    // Nothing to do here
  }
}
