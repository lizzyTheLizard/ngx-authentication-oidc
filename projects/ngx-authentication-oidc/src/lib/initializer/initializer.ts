import { LoginOptions } from "../configuration/login-options";
import { Logger } from "../logger/logger";
import { LoginResult } from "../login-result";
import { OidcLogin } from "../oidc/oidc-login";
import { OidcSilentLogin } from "../oidc/oidc-silent-login";
import { InitializerInput } from "./initializer-input";


export type Initializer = (input: InitializerInput, initialLoginResult: LoginResult) => Promise<LoginResult>;


export async function loginResponseCheck(input: InitializerInput, initialLoginResult: LoginResult) {
  const logger = input.loggerFactory('LoginResponseInitializer');
  const loginResult = initialLoginResult;
  if(!input.oidcResponse.isResponse()) {
    return loginResult;
  }
  const responseParams = input.oidcResponse.getResponseParamsFromQueryString();
  const responseLoginResult = await input.oidcResponse.handleResponse(responseParams)
  if(responseLoginResult.isLoggedIn) {
    logger.debug('This is a successful login response', responseLoginResult);
    return responseLoginResult;
  } else if (loginResult.isLoggedIn) {
    logger.debug('User is already logged in', loginResult);
  }
  return loginResult;
}

export async function silentLoginCheck(input: InitializerInput, initialLoginResult: LoginResult) : Promise<LoginResult> {
  const logger = input.loggerFactory('SilentLoginCheckInitializer');
  let loginResult = await loginResponseCheck(input, initialLoginResult);

  if(loginResult.isLoggedIn) {
    return loginResult;
  }

  logger.debug('Try login without user interaction');
  return login(logger, input.oidcSilentLogin, input.router.url).then(lr => {
    logger.info('User is silently logged in', loginResult);
    return lr;
  }).catch(e => {
    logger.info('Could not perform a silent login: ' + e.message);
    return {isLoggedIn: false};
  });
}

export async function enforceLogin(input: InitializerInput, initialLoginResult: LoginResult) {
  const logger = input.loggerFactory('EnforceLoginInitializer');
  let loginResult = await loginResponseCheck(input, initialLoginResult);

  if(loginResult.isLoggedIn) {
    return loginResult;
  }

  logger.debug('Try login with user interaction');
  loginResult = await login(logger, input.oidcLogin, input.router.url);
  if(!loginResult.isLoggedIn) {
    throw new Error('Cannot log in user');
  }
  logger.info('User is logged in', loginResult);
  return loginResult
}

export async function silentCheckAndThenEnforce(input: InitializerInput, initialLoginResult: LoginResult) {
  const logger = input.loggerFactory('EnforceLoginInitializer');
  let loginResult = await silentLoginCheck(input, initialLoginResult);

  if(loginResult.isLoggedIn) {
    return loginResult;
  }

  logger.debug('Try login with user interaction');
  loginResult = await login(logger, input.oidcLogin, input.router.url);
  if(!loginResult.isLoggedIn) {
    throw new Error('Cannot log in user');
  }
  logger.info('User is logged in', loginResult);
  return loginResult
}

async function login(logger: Logger, oidcLogin: OidcLogin | OidcSilentLogin, finalUrl: string): Promise<LoginResult> {
  const loginOptions: LoginOptions = { finalUrl: finalUrl};
  const loginResult = await oidcLogin.login(loginOptions);
  if(!loginResult.isLoggedIn) {
    logger.debug('Login was not successful, user is not logged in')
  } else {
    logger.debug('Login was successful, user is not logged in')
  }
  return loginResult;
}
