export interface LoginOptions {
  stateMessage?: string;
  finalUrl?: string;
  response_type?: ResponseType;
  scope?: string[];
  prompt?: string;
  ui_locales?: string;
  id_token_hint?: string;
  login_hint?: string;
  acr_values?: string;
}

export enum ResponseType {
  AUTH_CODE_FLOE = 'code',
  IMPLICIT_FLOW_ID = 'id_token',
  IMPLICIT_FLOW_TOKEN = 'id_token token',
  HYBRID_FLOW_ID = 'code id_token',
  HYBRID_FLOW_TOKEN = 'code token',
  HYBRID_FLOW_BOTH = 'code id_token token'
}
