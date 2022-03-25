/**
 * Parameters for a OIDC Authentication Request according to specification
 * https://openid.net/specs/openid-connect-core-1_0.html chapter 3.1.2.1.
 * Some parameters like client_id, redirect_uri, state, response_mode, nonce and  id_token_hint will
 * be set automatically using the given {@link OauthConfig}.
 * All values are optional
 */
export interface OidcParameters {
  /**
   * Scope is a mechanism in OAuth 2.0 to limit an application's access to a user's account.
   * An application can request one or more scopes, this information is then presented to the user
   * in the consent screen, and the access token issued to the application will be
   * limited to the scopes granted.
   * OpenID Connect requests MUST contain the openid scope value.
   * If not defined, [openid, profile, email, phone] is used.
   */
  scope: string[] | string;
  /**
   * Response Type value that determines the authorization processing flow to be used,
   * including what parameters are returned from the endpoints used.
   * When using the Authorization Code Flow, this value is code.
   */
  response_type: ResponseType;
  /**
   * Specifies how the Authorization Server displays the authentication and consent user
   * interface pages to the End-User. The defined values are:
   */
  display: DisplayType;
  /**
   * Specifies whether the Authorization Server prompts the End-User for
   * re-authentication and consent. By default, PAGE is used.
   */
  prompts: Prompt[] | Prompt;
  /**
   * Specifies the allowable elapsed time in seconds since the last time the End-User was
   * actively authenticated by the authentication server. If the elapsed time is greater
   * than this value, the authentication server MUST attempt to actively
   * re-authenticate the End-User.
   */
  max_age: number;
  /**
   * End-User's preferred languages and scripts for the user interface, list of BCP47 [RFC5646]
   * language tag values, ordered by preference.
   */
  ui_locales: string | string[];
  /**
   * ID Token previously issued by the Authorization Server.
   * Passed as a hint about the End-User's current or past authenticated session with the Client.
   * If the End-User identified by the ID Token is logged in or is logged in by the request, then
   * the Authorization Server returns a positive response; otherwise, it SHOULD return an error,
   * such as login_required.
   */
  id_token_hint: string;
  /**
   * Hint to the Authorization Server about the login identifier the End-User might use to log in
   */
  login_hint: string;
  /**
   * Opaque value used to maintain state between the request and the callback.
   * Will be returned as part of the successful login
   */
  state: string;
  /** Requested Authentication Context Class Reference values. */
  acr_values: string | string[];
}

/** Possible login options */
export interface LoginOptions extends Partial<OidcParameters> {
  /** Route to redirect to after login. If not given, redirect to current route */
  finalRoute?: string;
}

/**
 * Determines the authorization processing flow to be used,
 * including what parameters are returned from the endpoints used.
 * When using the Authorization Code Flow, this value is code.
 */
export enum ResponseType {
  AUTH_CODE_FLOW = 'code',
  IMPLICIT_FLOW_ID = 'id_token',
  IMPLICIT_FLOW_TOKEN = 'id_token token',
  HYBRID_FLOW_ID = 'code id_token',
  HYBRID_FLOW_TOKEN = 'code token',
  HYBRID_FLOW_BOTH = 'code id_token token'
}

/** Possible {@link OidcParameters.prompt} values */
export enum Prompt {
  /**
   * The Authorization Server MUST NOT display any authentication or consent user interface pages.
   * An error is returned if an End-User is not already authenticated or the Client does
   * not have pre-configured consent for the requested Claims or does not fulfill other
   * conditions for processing the request. The error code will typically be login_required,
   * interaction_required, or another code defined in Section 3.1.2.6. This can be used as a
   * method to check for existing authentication and/or consent.
   */
  NONE = 'none',
  /**
   * The Authorization Server SHOULD prompt the End-User for re-authentication.
   * If it cannot reauthenticate the End-User, it MUST return an error, typically login_required.
   */
  LOGIN = 'login',
  /**
   * The Authorization Server SHOULD prompt the End-User for consent
   * before returning information to the Client. If it cannot obtain consent, it MUST return an
   * error, typically consent_required.
   */
  CONSENT = 'consent',
  /**
   * The Authorization Server SHOULD prompt the End-User to select a user account.
   * This enables an End-User who has multiple accounts at the Authorization Server to select
   * amongst the multiple accounts that they might have current sessions for.
   * If it cannot obtain an account selection choice made by the End-User,
   * it MUST return an error, typically account_selection_required.
   */
  SELECT_ACCOUNT = 'select_account'
}

/** Possible {@link OidcParameters.display} values */
export enum DisplayType {
  /**
   * The Authorization Server SHOULD display the authentication and consent UI consistent
   * with a full User Agent page view. If the display parameter is not specified,
   * this is the default display mode.
   */
  PAGE = 'page',
  /**
   * The Authorization Server SHOULD display the authentication and consent UI consistent
   * with a popup User Agent window. The popup User Agent window should be of an appropriate size
   * for a login-focused dialog and should not obscure the entire window that it is popping up over.
   */
  POPUP = 'popup',
  /**
   * The Authorization Server SHOULD display the authentication and consent UI consistent with a
   * device that leverages a touch interface.
   */
  TOUCH = 'touch',
  /**
   * The Authorization Server SHOULD display the authentication and consent UI consistent with a
   * "feature phone" type display.
   */
  WAP = 'wap'
}
