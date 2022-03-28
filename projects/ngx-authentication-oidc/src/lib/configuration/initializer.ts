import { Initializer } from '../configuration/oauth-config';
import { LoginOptions, Prompt } from './login-options';

/**
 * Initializer that will check if this is an OIDC redirect and if so log the user in
 * @returns {Initializer} An initializer only checking if this is a response check
 */
export function loginResponseCheck(): Initializer {
  return async (input) => {
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
}

/**
 * Initializer that will try to do a non interactive login when the application is loaded
 * logged in then perform a normal login. The user is therewith forced to log in, but the
 * login is transparent if he already has a session at the authentication server. However,
 * the login can take longer than just {@link enforceLogin}.
 * @param {LoginOptions} loginOptions Login options to be used for logging in
 * @param {boolean} enforceLogin If set to true and the auto login fails, enforce a login
 * @returns {Initializer} An initializer trying to perform an auto login
 */
export function autoLoginIfPossible(
  loginOptions?: LoginOptions,
  enforceLogin?: boolean
): Initializer {
  return async (input) => {
    const logger = input.loggerFactory('silentLogin');
    const loginResponseCheckInst = loginResponseCheck();
    let loginResult = await loginResponseCheckInst(input);

    if (loginResult.isLoggedIn) {
      return loginResult;
    }
    if (input.isErrorResponse()) {
      return loginResult;
    }

    logger.debug('Try login without user interaction');
    const withoutInteractionResult = input.silentLoginEnabled
      ? await input.silentLogin(loginOptions ?? {})
      : await input.login({ prompts: Prompt.NONE, ...(loginOptions ?? {}) });
    if (withoutInteractionResult.isLoggedIn) {
      logger.debug('User is silently logged in', withoutInteractionResult);
      return withoutInteractionResult;
    }
    if (!enforceLogin) {
      return loginResult;
    }
    const withInteraction = await input.login(loginOptions ?? {});
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
 * @param {LoginOptions} loginOptions Login options to be used for logging in
 * @returns {Initializer} An initializer enforcing a login
 */
export function enforceLogin(loginOptions?: LoginOptions): Initializer {
  return async (input) => {
    const logger = input.loggerFactory('enforceLogin');
    const loginResponseCheckInst = loginResponseCheck();
    let loginResult = await loginResponseCheckInst(input);

    if (loginResult.isLoggedIn) {
      return loginResult;
    }

    logger.debug('Try login with user interaction');
    const r = await input.login(loginOptions ?? {});
    if (r.isLoggedIn) {
      logger.debug('User is logged in', r);
      return r;
    } else {
      throw new Error('Cannot log in user');
    }
  };
}
