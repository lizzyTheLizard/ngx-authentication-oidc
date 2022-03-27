import { Initializer } from '../configuration/oauth-config';
import { Prompt } from './login-options';

/**
 * Initializer that will check if this is an OIDC redirect and if so log the user in
 * @param {InitializerInput} input Initializer input
 * @returns {Promise<LoginResult>} The login result after a silent login
 */
export const loginResponseCheck: Initializer = async (input) => {
  const logger = input.loggerFactory('loginResponseCheck');
  const loginResult = input.initialLoginResult;
  const responseLoginResult = await input.handleResponse();
  if (responseLoginResult.isLoggedIn) {
    logger.debug('This is a successful login response', responseLoginResult);
    return responseLoginResult;
  } else if (loginResult.isLoggedIn) {
    logger.debug('User is already logged in', loginResult);
    return loginResult;
  }
  return responseLoginResult;
};

/**
 * Initializer that will try to do a non interactive login when the application is loaded
 * logged in then perform a normal login. The user is therewith forced to log in, but the
 * login is transparent if he already has a session at the authentication server. However,
 * the login can take longer than just {@link enforceLogin}.
 * @param {boolean} enforceLogin If set to true and the autologin fails, enforce a login
 * @returns {Promise<LoginResult>} The initializer function
 */
export function autoLoginIfPossible(enforceLogin?: boolean): Initializer {
  return async (input) => {
    const logger = input.loggerFactory('silentLogin');
    let loginResult = await loginResponseCheck(input);

    if (loginResult.isLoggedIn) {
      return loginResult;
    }
    if (input.isErrorResponse()) {
      return loginResult;
    }

    logger.debug('Try login without user interaction');
    const withoutInteractionResult = input.silentLoginEnabled
      ? await input.silentLogin({})
      : await input.login({ prompts: Prompt.NONE });
    if (withoutInteractionResult.isLoggedIn) {
      logger.debug('User is silently logged in', withoutInteractionResult);
      return withoutInteractionResult;
    }
    if (!enforceLogin) {
      return loginResult;
    }
    const withInteraction = await input.login({});
    if (withInteraction.isLoggedIn) {
      logger.debug('User is logged in', withInteraction);
      return withInteraction;
    } else {
      throw new Error('Cannot log in user');
    }
  };
}

/**
 * Initializer that will first perform a {@link loginResponseCheck}, and if the user is not
 * logged in then perform a normal login. The user is therewith forced to log in
 * @param {InitializerInput} input Initializer input
 * @returns {Promise<LoginResult>} The login result after a silent login
 */
export const enforceLogin: Initializer = async (input) => {
  const logger = input.loggerFactory('enforceLogin');
  let loginResult = await loginResponseCheck(input);

  if (loginResult.isLoggedIn) {
    return loginResult;
  }

  logger.debug('Try login with user interaction');
  const r = await input.login({});
  if (r.isLoggedIn) {
    logger.debug('User is logged in', r);
    return r;
  } else {
    throw new Error('Cannot log in user');
  }
};
