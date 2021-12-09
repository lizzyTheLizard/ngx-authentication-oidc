import { LoginResult } from "../oidc/login-result";
import { OidcService } from "../oidc/oidc.service";
import { enforceLogin, loginResponseCheck, silentCheckAndThenEnforce, silentLoginCheck } from "./default-initializer";
import { InitializerInput } from "./initializer";

const successfulLoginResult: LoginResult = { isLoggedIn: true, userInfo: 'test'};
const failedLoginResult: LoginResult = { isLoggedIn: false};

let input: InitializerInput;

describe('loginResponseCheck', async () => {
  beforeEach(() => {
    input = {
      loggerFactory: () => console,
      initialLoginResult: failedLoginResult,
      oidcService: {} as OidcService
    }
  });

  it("No login response", async () => {
    input.oidcService.checkResponse = jasmine.createSpy('processLoginResponse').and.returnValue(failedLoginResult);

    const result = await loginResponseCheck(input);

    expect(result).toEqual(failedLoginResult);
  });

  it("No login response but already logged in", async () => {
    input.oidcService.checkResponse = jasmine.createSpy('processLoginResponse').and.returnValue(failedLoginResult);
    input.initialLoginResult = successfulLoginResult;

    const result = await loginResponseCheck(input);

    expect(result).toEqual(successfulLoginResult);
  });

  it("Successful login", async () => {
    input.oidcService.checkResponse = jasmine.createSpy('processLoginResponse').and.returnValue(successfulLoginResult);

    const result = await loginResponseCheck(input);

    expect(result).toEqual(successfulLoginResult);
  });

  it("Successful login and already logged in", async () => {
    input.oidcService.checkResponse = jasmine.createSpy('processLoginResponse').and.returnValue(successfulLoginResult);
    input.initialLoginResult = { isLoggedIn: true, userInfo: 'other'};

    const result = await loginResponseCheck(input);

    expect(result).toEqual(successfulLoginResult);
  });

});

describe('silentLoginCheck', () => {
  beforeEach(() => {
    input = {
      loggerFactory: () => console,
      oidcService: {} as OidcService,
      initialLoginResult: failedLoginResult,
    }
    input.oidcService.login = jasmine.createSpy('login').and.returnValue(Promise.reject());
    input.oidcService.silentLogin = jasmine.createSpy('login').and.returnValue(Promise.reject());
    input.oidcService.checkResponse = jasmine.createSpy('login').and.returnValue(failedLoginResult);
  });

  it("Silent login failed", async () => {
    input.oidcService.silentLogin = jasmine.createSpy('silentLogin').and.returnValue(Promise.resolve(failedLoginResult));

    const result = await silentLoginCheck(input);

    expect(result).toEqual(failedLoginResult);
    expect(input.oidcService.silentLogin).toHaveBeenCalledTimes(1);
    expect(input.oidcService.silentLogin).toHaveBeenCalledWith({});
  });

  it("Already logged in", async () => {
    input.initialLoginResult = successfulLoginResult;

    const result = await silentLoginCheck(input);

    expect(result).toEqual(successfulLoginResult);
    expect(input.oidcService.silentLogin).toHaveBeenCalledTimes(0);
  });

  it("Silent login success", async () => {
    input.oidcService.silentLogin = jasmine.createSpy('silentLogin').and.returnValue(Promise.resolve(successfulLoginResult));

    const result = await silentLoginCheck(input);

    expect(result).toEqual(successfulLoginResult);
    expect(input.oidcService.silentLogin).toHaveBeenCalledTimes(1);
    expect(input.oidcService.silentLogin).toHaveBeenCalledWith({});
  });
});

describe('enforceLogin', () => {
  beforeEach(() => {
    input = {
      loggerFactory: () => console,
      oidcService: {} as OidcService,
      initialLoginResult: failedLoginResult,
    }
    input.oidcService.login = jasmine.createSpy('login').and.returnValue(Promise.reject());
    input.oidcService.silentLogin = jasmine.createSpy('login').and.returnValue(Promise.reject());
    input.oidcService.checkResponse = jasmine.createSpy('login').and.returnValue(failedLoginResult);
  });

  it("Login failed", done => {
    input.oidcService.login = jasmine.createSpy('login').and.returnValue(Promise.resolve(failedLoginResult));

    enforceLogin(input).then(() => {
      done.fail('Should not be possible');
    }).catch(e => {
      expect(e.message).toEqual('Cannot log in user');
      done();
    });
  });

  it("Already logged in", async () => {
    input.initialLoginResult = successfulLoginResult;

    const result = await enforceLogin(input);

    expect(result).toEqual(successfulLoginResult);
    expect(input.oidcService.login).toHaveBeenCalledTimes(0);
  });

  it("Login success", async () => {
    input.oidcService.login = jasmine.createSpy('login').and.returnValue(Promise.resolve(successfulLoginResult));

    const result = await enforceLogin(input);

    expect(result).toEqual(successfulLoginResult);
    expect(input.oidcService.login).toHaveBeenCalledTimes(1);
    expect(input.oidcService.login).toHaveBeenCalledWith({});
  });
});

describe('silentLoginAndThenEnforce', () => {
  beforeEach(() => {
    input = {
      loggerFactory: () => console,
      oidcService: {} as OidcService,
      initialLoginResult: failedLoginResult,
    }
    input.oidcService.login = jasmine.createSpy('login').and.returnValue(Promise.reject());
    input.oidcService.silentLogin = jasmine.createSpy('login').and.returnValue(Promise.reject());
    input.oidcService.checkResponse = jasmine.createSpy('login').and.returnValue(failedLoginResult);
  });

  it("Silent Login success", async () => {
    input.oidcService.silentLogin = jasmine.createSpy('silentLogin').and.returnValue(Promise.resolve(successfulLoginResult));

    const result = await silentCheckAndThenEnforce(input);

    expect(result).toEqual(successfulLoginResult);
    expect(input.oidcService.silentLogin).toHaveBeenCalledTimes(1);
    expect(input.oidcService.silentLogin).toHaveBeenCalledWith({});
    expect(input.oidcService.login).toHaveBeenCalledTimes(0);
  });

  it("Silent Login Failed", async () => {
    input.oidcService.silentLogin = jasmine.createSpy('silentLogin').and.returnValue(Promise.resolve(failedLoginResult));
    input.oidcService.login = jasmine.createSpy('login').and.returnValue(Promise.resolve(successfulLoginResult));

    const result = await silentCheckAndThenEnforce(input);

    expect(result).toEqual(successfulLoginResult);
    expect(input.oidcService.silentLogin).toHaveBeenCalledTimes(1);
    expect(input.oidcService.silentLogin).toHaveBeenCalledWith({});
    expect(input.oidcService.login).toHaveBeenCalledTimes(1);
    expect(input.oidcService.login).toHaveBeenCalledWith({});
  });

  it("Both Failed", (done) => {
    input.oidcService.silentLogin = jasmine.createSpy('silentLogin').and.returnValue(Promise.resolve(failedLoginResult));
    input.oidcService.login = jasmine.createSpy('login').and.returnValue(Promise.resolve(failedLoginResult));

    silentCheckAndThenEnforce(input).then(() => {
      done.fail('Should not be possible');
    }).catch(e => {
      expect(e.message).toEqual('Cannot log in user');
      done();
    });
  });
});
