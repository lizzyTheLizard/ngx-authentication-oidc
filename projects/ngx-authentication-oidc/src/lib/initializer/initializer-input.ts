import { Inject, Injectable } from "@angular/core"
import { Router } from "@angular/router";
import { LoggerFactoryToken } from "../authentication-module";
import { LoggerFactory } from "../logger/logger";
import { OidcLogin } from "../oidc/oidc-login";
import { OidcResponse } from "../oidc/oidc-response";
import { OidcSilentLogin } from "../oidc/oidc-silent-login";

@Injectable()
export class InitializerInput {
  constructor(
      @Inject(LoggerFactoryToken) public readonly loggerFactory: LoggerFactory, 
      public readonly oidcResponse: OidcResponse,
      public readonly oidcSilentLogin: OidcSilentLogin,
      public readonly oidcLogin: OidcLogin,
      public readonly router: Router,
  ){}
}
