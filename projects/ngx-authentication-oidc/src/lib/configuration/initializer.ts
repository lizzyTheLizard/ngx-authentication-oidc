import { Initializer } from '../configuration/oauth-config';

/**
 * Initializer that will check if this is an OIDC redirect and if so log the user in
 * @param {InitializerInput} input Initializer input
 * @returns {Promise<LoginResult>} The login result after a silent login
 */
export const loginResponseCheck: Initializer = async (input) => {
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
};

/**
 * Initializer that will first perform a {@link loginResponseCheck}, and if the user is not
 * logged in then try a silent login. The user is therewith automatically logged in if he already
 * has a session at the authentication server.
 * @param {InitializerInput} input Initializer input
 * @returns {Promise<LoginResult>} The login result after a silent login
 */
export const silentLoginCheck: Initializer = async (input) => {
  const logger = input.loggerFactory('SilentLoginCheckInitializer');
  let loginResult = await loginResponseCheck(input);

  if (loginResult.isLoggedIn) {
    return loginResult;
  }

  logger.debug('Try login without user interaction');
  return input.silentLogin({}).then((r) => {
    if (r.isLoggedIn) {
      logger.debug('User is silently logged in', loginResult);
    } else {
      logger.debug('Single login failed');
    }
    return r;
  });
};

/**
 * Initializer that will first perform a {@link loginResponseCheck}, and if the user is not
 * logged in then perform a normal login. The user is therewith forced to log in
 * @param {InitializerInput} input Initializer input
 * @returns {Promise<LoginResult>} The login result after a silent login
 */
export const enforceLogin: Initializer = async (input) => {
  const logger = input.loggerFactory('EnforceLoginInitializer');
  let loginResult = await loginResponseCheck(input);

  if (loginResult.isLoggedIn) {
    return loginResult;
  }

  logger.debug('Try login with user interaction');
  return input.login({}).then((r) => {
    if (r.isLoggedIn) {
      logger.debug('User is logged in', loginResult);
      return r;
    } else {
      throw new Error('Cannot log in user');
    }
  });
};

/**
 * Initializer that will first perform a {@link silentLoginCheck}, and if the user is not
 * logged in then perform a normal login. The user is therewith forced to log in, but the
 * login is transparent if he already has a session at the authentication server. However,
 * the login can take longer than just {@link enforceLogin}.
 * @param {InitializerInput} input Initializer input
 * @returns {Promise<LoginResult>} The login result after a silent login
 */
export const silentCheckAndThenEnforce: Initializer = async (input) => {
  const logger = input.loggerFactory('EnforceLoginInitializer');
  let loginResult = await silentLoginCheck(input);

  if (loginResult.isLoggedIn) {
    return loginResult;
  }

  logger.debug('Try login with user interaction');
  return input.login({}).then((r) => {
    if (r.isLoggedIn) {
      logger.debug('User is logged in', loginResult);
      return r;
    } else {
      throw new Error('Cannot log in user');
    }
  });
};
