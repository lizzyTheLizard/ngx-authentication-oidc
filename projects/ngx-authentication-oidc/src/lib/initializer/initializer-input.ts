import { LoggerFactory } from "ngx-authentication-oidc";
import { LoginOptions } from "../configuration/login-options";
import { LoginResult } from "../login-result";

export interface InitializerInput {
  initialLoginResult: LoginResult;
  loggerFactory: LoggerFactory;
  login(loginOptions: LoginOptions): Promise<LoginResult>;
  silentLogin(loginOptions: LoginOptions): Promise<LoginResult>;
  isResponse(): boolean;
  handleResponse(): Promise<LoginResult>;
}
