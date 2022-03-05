import { ResponseParameterParser } from './response-parameter-parser';

describe('ResponseParameterParser', () => {
  it('Parse code url', () => {
    const input = new URL('http://example.com/?code=code&other=nonsense');

    const target = new ResponseParameterParser();
    const result = target.parseUrl(input);

    expect(result).toEqual({
      code: 'code'
    });
  });

  it('Parse hash url', () => {
    const input = new URL('http://example.com/#code=code&other=nonsense');

    const target = new ResponseParameterParser();
    const result = target.parseUrl(input);

    expect(result).toEqual({
      code: 'code'
    });
  });

  it('Parse token url', () => {
    const input = new URL(
      'http://example.com/?expires_in=231&other=nonsense&id_token=it&access_token=at&refresh_token=rt&session_state=ss'
    );

    const target = new ResponseParameterParser();
    const result = target.parseUrl(input);

    expect(result).toEqual({
      expires_in: '231',
      id_token: 'it',
      access_token: 'at',
      refresh_token: 'rt',
      session_state: 'ss'
    });
  });

  it('Parse error url', () => {
    const input = new URL(
      'http://example.com/?error=error&error_description=desc&error_uri=uri&other=nonsense'
    );

    const target = new ResponseParameterParser();
    const result = target.parseUrl(input);

    expect(result).toEqual({
      error: 'error',
      error_description: 'desc',
      error_uri: 'uri'
    });
  });

  it('Parse code body', () => {
    const input = {
      other: 'nonsense',
      code: 'code'
    };

    const target = new ResponseParameterParser();
    const result = target.parseBody(input);

    expect(result).toEqual({
      code: 'code'
    });
  });

  it('Parse token body', () => {
    const input = {
      other: 'nonsense',
      expires_in: '231',
      id_token: 'it',
      access_token: 'at',
      refresh_token: 'rt',
      session_state: 'ss'
    };

    const target = new ResponseParameterParser();
    const result = target.parseBody(input);

    expect(result).toEqual({
      expires_in: '231',
      id_token: 'it',
      access_token: 'at',
      refresh_token: 'rt',
      session_state: 'ss'
    });
  });

  it('Parse error body', () => {
    const input = {
      other: 'nonsense',
      error: 'error',
      error_description: 'desc',
      error_uri: 'uri'
    };

    const target = new ResponseParameterParser();
    const result = target.parseBody(input);

    expect(result).toEqual({
      error: 'error',
      error_description: 'desc',
      error_uri: 'uri'
    });
  });
});
