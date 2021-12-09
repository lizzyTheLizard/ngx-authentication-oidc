import { LoggerFactory } from "../logger/logger";
import { LoginResult } from "../oidc/login-result";
import { OidcService } from "../oidc/oidc.service";

export interface InitializerInput {
  loggerFactory: LoggerFactory, 
  initialLoginResult: LoginResult,
  oidcService: OidcService
}

export type Initializer = (input: InitializerInput) => Promise<LoginResult>;
