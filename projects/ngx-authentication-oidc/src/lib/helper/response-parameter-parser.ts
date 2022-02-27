import { CustomHttpParamEncoder } from '../helper/custom-http-param-encoder';
import { State } from '../helper/state';

export interface Response extends State {
  error_description?: string;
  error_uri?: string;
  expires_in?: string;
  error?: string;
  code?: string;
  id_token?: string;
  access_token?: string;
  refresh_token?: string;
  session_state?: string;
}

export class ResponseParameterParser {
  private readonly encoder = new CustomHttpParamEncoder();

  public parseUrl(url: URL): Response {
    const queryString = url.hash ? url.hash.substr(1) : url.search;
    const urlSearchParams = new URLSearchParams(queryString);
    const state = this.parseResponseState(urlSearchParams.get('state'));
    const ret = { ...state };
    this.addIfGiven(ret, 'error_description', urlSearchParams);
    this.addIfGiven(ret, 'error_uri', urlSearchParams);
    this.addIfGiven(ret, 'expires_in', urlSearchParams);
    this.addIfGiven(ret, 'error', urlSearchParams);
    this.addIfGiven(ret, 'code', urlSearchParams);
    this.addIfGiven(ret, 'id_token', urlSearchParams);
    this.addIfGiven(ret, 'access_token', urlSearchParams);
    this.addIfGiven(ret, 'refresh_token', urlSearchParams);
    this.addIfGiven(ret, 'session_state', urlSearchParams);
    return ret;
  }

  private addIfGiven(obj: any, key: string, params: URLSearchParams) {
    if (params.has(key)) {
      obj[key] = params.get(key);
    }
  }

  private parseResponseState(state: string | null): State {
    if (!state) {
      return {};
    }
    try {
      return JSON.parse(state);
    } catch (e) {
      return { stateMessage: state };
    }
  }

  public parseBody(body: any): Response {
    const state = this.parseResponseState(body.state);
    const ret: Response = { ...state };
    if (body.error_description) ret.error_description = body.error_description;
    if (body.error_uri) ret.error_uri = body.error_uri;
    if (body.expires_in) ret.expires_in = body.expires_in.toString();
    if (body.error) ret.error = body.error;
    if (body.code) ret.code = body.code;
    if (body.id_token) ret.id_token = body.id_token;
    if (body.access_token) ret.access_token = body.access_token;
    if (body.refresh_token) ret.refresh_token = body.refresh_token;
    if (body.session_state) ret.session_state = body.session_state;
    return ret;
  }
}
