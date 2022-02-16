import { InitializerInput } from '../configuration/oauth-config';
import { LoginResult } from '../helper/login-result';

// TODO: Document public API

export async function loginResponseCheck(input: InitializerInput) {
  const logger = input.loggerFactory('LoginResponseInitializer');
  const loginResult = input.initialLoginResult;
  const responseLoginResult = await input.handleResponse();
  if (responseLoginResult.isLoggedIn) {
    logger.debug('This is a successful login response', responseLoginResult);
    return responseLoginResult;
  } else if (loginResult.isLoggedIn) {
    logger.debug('User is already logged in', loginResult);
  }
  return loginResult;
}

export async function silentLoginCheck(
  input: InitializerInput
): Promise<LoginResult> {
  const logger = input.loggerFactory('SilentLoginCheckInitializer');
  let loginResult = await loginResponseCheck(input);

  if (loginResult.isLoggedIn) {
    return loginResult;
  }

  logger.debug('Try login without user interaction');
  return input
    .silentLogin({})
    .then((r) => {
      if (r.isLoggedIn) {
        logger.info('User is silently logged in', loginResult);
      } else {
        logger.info('Single login failed');
      }
      return r;
    })
    .catch((e) => {
      logger.info('Could not perform a silent login: ' + e.message);
      return { isLoggedIn: false };
    });
}

export async function enforceLogin(
  input: InitializerInput
): Promise<LoginResult> {
  const logger = input.loggerFactory('EnforceLoginInitializer');
  let loginResult = await loginResponseCheck(input);

  if (loginResult.isLoggedIn) {
    return loginResult;
  }

  logger.debug('Try login with user interaction');
  return input.login({}).then((r) => {
    if (r.isLoggedIn) {
      logger.info('User is logged in', loginResult);
      return r;
    } else {
      throw new Error('Cannot log in user');
    }
  });
}

export async function silentCheckAndThenEnforce(input: InitializerInput) {
  const logger = input.loggerFactory('EnforceLoginInitializer');
  let loginResult = await silentLoginCheck(input);

  if (loginResult.isLoggedIn) {
    return loginResult;
  }

  logger.debug('Try login with user interaction');
  return input.login({}).then((r) => {
    if (r.isLoggedIn) {
      logger.info('User is logged in', loginResult);
      return r;
    } else {
      throw new Error('Cannot log in user');
    }
  });
}
