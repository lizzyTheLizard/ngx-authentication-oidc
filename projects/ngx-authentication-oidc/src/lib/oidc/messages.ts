import { ResponseType } from "../configuration/login-options";

interface State {
  stateMessage?: string,
  finalUrl?: string
}

function decodeState(state: string | null): State{
  if(!state){
    return {};
  }
  try {
    return JSON.parse(state);
  } catch (e) {
    return { stateMessage: state};
  }
}

function encodeState(state: State): string {
  return JSON.stringify({stateMessage: state.stateMessage, finalUrl: state.finalUrl});
}

export interface ResponseParams {
    error_description?: string;
    error_uri?: string;
    expires_in?: string;
    error?: string;
    code?: string;
    id_token?: string;
    access_token?: string;
    stateMessage?: string;
    finalUrl?: string;
}

export function parseResponseParams(queryString: string): ResponseParams  {
  const urlSearchParams = new URLSearchParams(queryString);
  const state = decodeState(urlSearchParams.get('state'));
  return {
    ...state,
    error_description: urlSearchParams.get('error_description') ?? undefined,
    error_uri: urlSearchParams.get('error_uri') ?? undefined,
    expires_in: urlSearchParams.get('expires_in') ?? undefined,
    error: urlSearchParams.get('error') ?? undefined,
    code: urlSearchParams.get('code') ?? undefined,
    id_token: urlSearchParams.get('id_token') ?? undefined,
    access_token: urlSearchParams.get('access_token') ?? undefined,
  };
}

export interface RequestParams {
  authEndpoint: string | URL;
  clientId: string;
  redirectUri: string;
  response_type?: string;
  scope?: string[];
  prompt?: string;
  ui_locales?: string;
  id_token_hint?: string;
  login_hint?: string;
  acr_values?: string;
  nonce?: string;
  stateMessage?: string;
  finalUrl?: string;
}

export function createAuthenticationRequest(requestMessage: RequestParams): URL {
  const url = new URL(requestMessage.authEndpoint);
  url.searchParams.append("response_type", requestMessage.response_type ?? ResponseType.AUTH_CODE_FLOE );
  url.searchParams.append("scope", requestMessage.scope?.join(" ") ?? "openid profile");
  url.searchParams.append("client_id", requestMessage.clientId);
  url.searchParams.append("state", encodeState(requestMessage));
  url.searchParams.append("redirect_uri", requestMessage.redirectUri);
  if(requestMessage.nonce) {
    url.searchParams.append("nonce", requestMessage.nonce);
  }
  if(requestMessage.prompt) {
    url.searchParams.append("prompt", requestMessage.prompt);
  }
  if(requestMessage.ui_locales) {
    url.searchParams.append("ui_locales", requestMessage.ui_locales);
  }
  if(requestMessage.id_token_hint) {
    url.searchParams.append("id_token_hint", requestMessage.id_token_hint);
  }
  if(requestMessage.login_hint) {
    url.searchParams.append("login_hint", requestMessage.login_hint);
  }
  if(requestMessage.acr_values) {
    url.searchParams.append("acr_values", requestMessage.acr_values);
  }
  return url;
}

export interface Metadata {
  token_endpoint: string;
  authorization_endpoint: string;
  jwks_uri?: string;
  userinfo_endpoint?: string;
  check_session_iframe?: string;
  end_session_endpoint?: string;
}
