import { Router } from "@angular/router";
import { LoginResult } from "../login-result";
import { enforceLogin, loginResponseCheck, silentCheckAndThenEnforce, silentLoginCheck } from "./initializer";
import { InitializerInput } from "./initializer-input";

const successfulLoginResult: LoginResult = { isLoggedIn: true, userInfo: {sub: 'test'}};
const failedLoginResult: LoginResult = { isLoggedIn: false};

let input: InitializerInput;

describe('loginResponseCheck', async () => {
  beforeEach(() => {
    input = {
      loggerFactory: () => console,
      oidcLogin: jasmine.createSpyObj('oidcLogin', ['login']),
      oidcResponse: jasmine.createSpyObj('oidcResponse', ['handleResponse', 'isResponse', 'getResponseParamsFromQueryString']),
      oidcSilentLogin: jasmine.createSpyObj('oidcSilentLogin',['login']),
      router: {url: "https://example.com/current"} as Router
    }
  });

  it("No login response", async () => {
    input.oidcResponse.isResponse = jasmine.createSpy('isResponse').and.returnValue(false);

    const result = await loginResponseCheck(input, failedLoginResult);

    expect(result).toEqual(failedLoginResult);
  });

  it("No login response but already logged in", async () => {
    input.oidcResponse.isResponse = jasmine.createSpy('isResponse').and.returnValue(false);

    const result = await loginResponseCheck(input, successfulLoginResult);

    expect(result).toEqual(successfulLoginResult);
  });

  it("Successful login", async () => {
    input.oidcResponse.isResponse = jasmine.createSpy('isResponse').and.returnValue(true);
    input.oidcResponse.handleResponse = jasmine.createSpy('processLoginResponse').and.returnValue(successfulLoginResult);

    const result = await loginResponseCheck(input, failedLoginResult);

    expect(result).toEqual(successfulLoginResult);
  });

  it("Successful login and already logged in", async () => {
    input.oidcResponse.isResponse = jasmine.createSpy('isResponse').and.returnValue(true);
    input.oidcResponse.handleResponse = jasmine.createSpy('processLoginResponse').and.returnValue(successfulLoginResult);

    const result = await loginResponseCheck(input, { isLoggedIn: true, userInfo: {sub: 'other'}});

    expect(result).toEqual(successfulLoginResult);
  });

});

describe('silentLoginCheck', () => {
  beforeEach(() => {
    input = {
      loggerFactory: () => console,
      oidcLogin: jasmine.createSpyObj('oidcLogin', ['login']),
      oidcResponse: jasmine.createSpyObj('oidcResponse', ['handleResponse', 'isResponse', 'getResponseParamsFromQueryString']),
      oidcSilentLogin: jasmine.createSpyObj('oidcSilentLogin',['login']),
      router: {url: "https://example.com/current"} as Router
    }
    input.oidcLogin.login = jasmine.createSpy('login').and.returnValue(Promise.reject());
    input.oidcSilentLogin.login = jasmine.createSpy('login').and.returnValue(Promise.reject());
    input.oidcResponse.handleResponse = jasmine.createSpy('handleResponse').and.returnValue(failedLoginResult);
  });

  it("Silent login failed", async () => {
    input.oidcSilentLogin.login = jasmine.createSpy('silentLogin').and.returnValue(Promise.resolve(failedLoginResult));

    const result = await silentLoginCheck(input, failedLoginResult);

    expect(result).toEqual(failedLoginResult);
    expect(input.oidcSilentLogin.login).toHaveBeenCalledTimes(1);
    expect(input.oidcSilentLogin.login).toHaveBeenCalledWith({finalUrl: "https://example.com/current"});
  });

  it("Already logged in", async () => {
    const result = await silentLoginCheck(input, successfulLoginResult);

    expect(result).toEqual(successfulLoginResult);
    expect(input.oidcSilentLogin.login).toHaveBeenCalledTimes(0);
  });

  it("Silent login success", async () => {
    input.oidcSilentLogin.login = jasmine.createSpy('silentLogin').and.returnValue(Promise.resolve(successfulLoginResult));

    const result = await silentLoginCheck(input, failedLoginResult);

    expect(result).toEqual(successfulLoginResult);
    expect(input.oidcSilentLogin.login).toHaveBeenCalledTimes(1);
    expect(input.oidcSilentLogin.login).toHaveBeenCalledWith({finalUrl: "https://example.com/current"});
  });
});

describe('enforceLogin', () => {
  beforeEach(() => {
    input = {
      loggerFactory: () => console,
      oidcLogin: jasmine.createSpyObj('oidcLogin', ['login']),
      oidcResponse: jasmine.createSpyObj('oidcResponse', ['handleResponse', 'isResponse', 'getResponseParamsFromQueryString']),
      oidcSilentLogin: jasmine.createSpyObj('oidcSilentLogin',['login']),
      router: {url: "https://example.com/current"} as Router
    }
    input.oidcLogin.login = jasmine.createSpy('login').and.returnValue(Promise.reject());
    input.oidcSilentLogin.login = jasmine.createSpy('login').and.returnValue(Promise.reject());
    input.oidcResponse.handleResponse = jasmine.createSpy('login').and.returnValue(failedLoginResult);
  });

  it("Login failed", done => {
    input.oidcLogin.login = jasmine.createSpy('login').and.returnValue(Promise.resolve(failedLoginResult));

    enforceLogin(input, failedLoginResult).then(() => {
      done.fail('Should not be possible');
    }).catch(e => {
      expect(e.message).toEqual('Cannot log in user');
      done();
    });
  });

  it("Already logged in", async () => {
    const result = await enforceLogin(input, successfulLoginResult);

    expect(result).toEqual(successfulLoginResult);
    expect(input.oidcLogin.login).toHaveBeenCalledTimes(0);
  });

  it("Login success", async () => {
    input.oidcLogin.login = jasmine.createSpy('login').and.returnValue(Promise.resolve(successfulLoginResult));

    const result = await enforceLogin(input, failedLoginResult);

    expect(result).toEqual(successfulLoginResult);
    expect(input.oidcLogin.login).toHaveBeenCalledTimes(1);
    expect(input.oidcLogin.login).toHaveBeenCalledWith({finalUrl: "https://example.com/current"});
  });
});

describe('silentLoginAndThenEnforce', () => {
  beforeEach(() => {
    input = {
      loggerFactory: () => console,
      oidcLogin: jasmine.createSpyObj('oidcLogin', ['login']),
      oidcResponse: jasmine.createSpyObj('oidcResponse', ['handleResponse', 'isResponse', 'getResponseParamsFromQueryString']),
      oidcSilentLogin: jasmine.createSpyObj('oidcSilentLogin',['login']),
      router: {url: "https://example.com/current"} as Router
    }
    input.oidcLogin.login = jasmine.createSpy('login').and.returnValue(Promise.reject());
    input.oidcSilentLogin.login = jasmine.createSpy('login').and.returnValue(Promise.reject());
    input.oidcResponse.handleResponse = jasmine.createSpy('login').and.returnValue(failedLoginResult);
  });

  it("Silent Login success", async () => {
    input.oidcSilentLogin.login = jasmine.createSpy('silentLogin').and.returnValue(Promise.resolve(successfulLoginResult));

    const result = await silentCheckAndThenEnforce(input, failedLoginResult);

    expect(result).toEqual(successfulLoginResult);
    expect(input.oidcSilentLogin.login).toHaveBeenCalledTimes(1);
    expect(input.oidcSilentLogin.login).toHaveBeenCalledWith({finalUrl: "https://example.com/current"});
    expect(input.oidcLogin.login).toHaveBeenCalledTimes(0);
  });

  it("Silent Login Failed", async () => {
    input.oidcSilentLogin.login = jasmine.createSpy('silentLogin').and.returnValue(Promise.resolve(failedLoginResult));
    input.oidcLogin.login = jasmine.createSpy('login').and.returnValue(Promise.resolve(successfulLoginResult));

    const result = await silentCheckAndThenEnforce(input, failedLoginResult);

    expect(result).toEqual(successfulLoginResult);
    expect(input.oidcSilentLogin.login).toHaveBeenCalledTimes(1);
    expect(input.oidcSilentLogin.login).toHaveBeenCalledWith({finalUrl: "https://example.com/current"});
    expect(input.oidcLogin.login).toHaveBeenCalledTimes(1);
    expect(input.oidcLogin.login).toHaveBeenCalledWith({finalUrl: "https://example.com/current"});
  });

  it("Both Failed", (done) => {
    input.oidcSilentLogin.login = jasmine.createSpy('silentLogin').and.returnValue(Promise.resolve(failedLoginResult));
    input.oidcLogin.login = jasmine.createSpy('login').and.returnValue(Promise.resolve(failedLoginResult));

    silentCheckAndThenEnforce(input, failedLoginResult).then(() => {
      done.fail('Should not be possible');
    }).catch(e => {
      expect(e.message).toEqual('Cannot log in user');
      done();
    });
  });
});
