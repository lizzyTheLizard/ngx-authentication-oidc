import { Logger } from "../logger/logger";
import { LoginResult, OidcService } from "../oidc/oidc.service";
import { InitializerInput } from "./initializer";

export async function loginResponseCheck(input: InitializerInput) {
  const logger = input.loggerFactory('LoginResponseInitializer');
  const loginResult = input.initialLoginResult;

  const responseLoginResult = await input.oidcService.checkResponse()
  
  if(responseLoginResult.isLoggedIn) {
    logger.debug('This is a successful login response', responseLoginResult);
    return responseLoginResult;
  } else if (loginResult.isLoggedIn) {
    logger.debug('User is already logged in', loginResult);
  }
  return loginResult;
}

export async function silentLoginCheck(input: InitializerInput) : Promise<LoginResult> {
  const logger = input.loggerFactory('SilentLoginCheckInitializer');
  let loginResult = await loginResponseCheck(input);

  if(loginResult.isLoggedIn) {
    return loginResult;
  }

  logger.debug('Try login without user interaction');
  return login(logger, input.oidcService, true).then(lr => {
    logger.info('User is silently logged in', loginResult);
    return lr;
  }).catch(e => {
    logger.info('Could not perform a silent login',e);
    return {isLoggedIn: false};
  });
}

export async function enforceLogin(input: InitializerInput) {
  const logger = input.loggerFactory('EnforceLoginInitializer');
  let loginResult = await loginResponseCheck(input);

  if(loginResult.isLoggedIn) {
    return loginResult;
  }

  logger.debug('Try login with user interaction');
  loginResult = await login(logger, input.oidcService, false);
  if(!loginResult.isLoggedIn) {
    throw new Error('Cannot log in user');
  }
  logger.info('User is logged in', loginResult);
  return loginResult
}

export async function silentCheckAndThenEnforce(input: InitializerInput) {
  const logger = input.loggerFactory('EnforceLoginInitializer');
  let loginResult = await silentLoginCheck(input);

  if(loginResult.isLoggedIn) {
    return loginResult;
  }

  logger.debug('Try login with user interaction');
  loginResult = await login(logger, input.oidcService, false);
  if(!loginResult.isLoggedIn) {
    throw new Error('Cannot log in user');
  }
  logger.info('User is logged in', loginResult);
  return loginResult
}

async function login(logger: Logger, oidcService: OidcService, silent: boolean): Promise<LoginResult> {
  const loginOptions = {};
  const loginResult = await (silent ? oidcService.silentLogin(loginOptions) : oidcService.login(loginOptions));
  if(!loginResult.isLoggedIn) {
    logger.debug('Login was not successful, user is not logged in')
  } else {
    logger.debug('Login was successful, user is not logged in')
  }
  return loginResult;
}

