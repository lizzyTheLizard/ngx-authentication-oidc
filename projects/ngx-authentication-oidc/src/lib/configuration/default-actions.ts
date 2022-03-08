import { Router, UrlTree } from '@angular/router';
import { LogoutAction, LogoutActionInput } from './oauth-config';

/**
 * Logs out the user at the authentication server as well ("single logout")
 * @param {string} singleLogoutRedirectUri URL to redirect to after a successful single logout.
 *     Must be an absolute URL and registered with the authentication server.
 *     If none given, the "normal" redirectURL will be used.
 * @returns {LogoutAction} The action to be used in the configuration
 */
export function singleLogout(singleLogoutRedirectUri?: string): LogoutAction {
  return async (input: LogoutActionInput): Promise<void> => {
    input.singleLogout(singleLogoutRedirectUri);
  };
}

/**
 * Redirect the user to another page
 * @param {string | UrlTree} redirectUri URL to redirect to after. Can be a relative URL
 * @returns {RedirectAction} The action to be used in the configuration, can be used
 *        as {@link LogoutAction} or as {@link ErrorAction}
 */
export function redirect(redirectUri: string | UrlTree): RedirectAction {
  return async (input: RedirectInput): Promise<void> => {
    input.router.navigateByUrl(redirectUri);
  };
}

export interface RedirectInput {
  router: Router;
}
export type RedirectAction = (input: RedirectInput) => Promise<void>;

/**
 * Logs out the user at the authentication server as well ("single logout") if supported by the
 * authentication server and performs a redirect to another page otherwise
 * @param {string | UrlTree} redirectUri URL to redirect to after. Can be a relative URL
 * @param {string} singleLogoutRedirectUri URL to redirect to after a successful single logout.
 *     Must be an absolute URL and registered with the authentication server.
 *     If none given, the "normal" redirectURL will be used.
 * @returns {LogoutAction} The action to be used in the configuration
 */
export function singleLogoutOrRedirect(
  redirectUri: string | UrlTree,
  singleLogoutRedirectUri?: string
): LogoutAction {
  return async (input: LogoutActionInput): Promise<void> => {
    const res = await input.singleLogout(singleLogoutRedirectUri);
    if (!res) {
      await input.router.navigateByUrl(redirectUri);
    }
  };
}
