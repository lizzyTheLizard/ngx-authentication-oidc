import { Router, UrlTree } from '@angular/router';
import { LogoutAction, LogoutActionInput } from '../configuration/oauth-config';

/**
 * Logs out the user at the authentication server as well ("single logout")
 * @param {string} singleLogoutRedirectUri URL to redirect to after a successful single logout.
 *     Must be an absolute URL and registered with the authentication server.
 *     If none given, the "normal" redirectURL will be used.
 * @returns {LogoutAction} The action to be used in the configuration
 */
export function singleLogout(singleLogoutRedirectUri?: string): LogoutAction {
  return (input: LogoutActionInput): void => {
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
  return (input: RedirectInput): void => {
    input.router.navigateByUrl(redirectUri);
  };
}

export interface RedirectInput {
  router: Router;
}
export type RedirectAction = (input: RedirectInput) => void;

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
  return (input: LogoutActionInput): Promise<void> => {
    return input.singleLogout(singleLogoutRedirectUri).then((r) => {
      if (!r) {
        return input.router.navigateByUrl(redirectUri).then(() => {});
      }
      return;
    });
  };
}
