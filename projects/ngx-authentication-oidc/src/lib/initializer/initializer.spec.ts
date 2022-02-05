import { LoginResult } from "../login-result";
import { enforceLogin, loginResponseCheck, silentCheckAndThenEnforce, silentLoginCheck } from "./initializer";
import { InitializerInput } from "./initializer-input";

const successfulLoginResult: LoginResult = { isLoggedIn: true, userInfo: {sub: 'test'}};
const failedLoginResult: LoginResult = { isLoggedIn: false};

let input: InitializerInput;

describe('loginResponseCheck', async () => {
  beforeEach(() => {
    input = jasmine.createSpyObj('input',['login', 'silentLogin', 'isResponse', 'handleResponse']);
    input.loggerFactory = () => console;
  });

  it("No login response", async () => {
    input.isResponse = jasmine.createSpy('isResponse').and.returnValue(false);

    const result = await loginResponseCheck(input, failedLoginResult);

    expect(result).toEqual(failedLoginResult);
  });

  it("No login response but already logged in", async () => {
    input.isResponse = jasmine.createSpy('isResponse').and.returnValue(false);

    const result = await loginResponseCheck(input, successfulLoginResult);

    expect(result).toEqual(successfulLoginResult);
  });

  it("Successful login", async () => {
    input.isResponse = jasmine.createSpy('isResponse').and.returnValue(true);
    input.handleResponse = jasmine.createSpy('processLoginResponse').and.returnValue(successfulLoginResult);

    const result = await loginResponseCheck(input, failedLoginResult);

    expect(result).toEqual(successfulLoginResult);
  });

  it("Successful login and already logged in", async () => {
    input.isResponse = jasmine.createSpy('isResponse').and.returnValue(true);
    input.handleResponse = jasmine.createSpy('processLoginResponse').and.returnValue(successfulLoginResult);

    const result = await loginResponseCheck(input, { isLoggedIn: true, userInfo: {sub: 'other'}});

    expect(result).toEqual(successfulLoginResult);
  });

});

describe('silentLoginCheck', () => {
  beforeEach(() => {
    input = jasmine.createSpyObj('input',['login', 'silentLogin', 'isResponse', 'handleResponse']);
    input.loggerFactory = () => console;
    input.login = jasmine.createSpy('login').and.returnValue(Promise.reject());
    input.silentLogin = jasmine.createSpy('silentLogin').and.returnValue(Promise.reject());
    input.handleResponse = jasmine.createSpy('handleResponse').and.returnValue(failedLoginResult);
  });

  it("Silent login failed", async () => {
    input.silentLogin = jasmine.createSpy('silentLogin').and.returnValue(Promise.resolve(failedLoginResult));

    const result = await silentLoginCheck(input, failedLoginResult);

    expect(result).toEqual(failedLoginResult);
    expect(input.silentLogin).toHaveBeenCalledTimes(1);
    expect(input.silentLogin).toHaveBeenCalledWith({});
  });

  it("Already logged in", async () => {
    const result = await silentLoginCheck(input, successfulLoginResult);

    expect(result).toEqual(successfulLoginResult);
    expect(input.login).toHaveBeenCalledTimes(0);
  });

  it("Silent login success", async () => {
    input.silentLogin = jasmine.createSpy('silentLogin').and.returnValue(Promise.resolve(successfulLoginResult));

    const result = await silentLoginCheck(input, failedLoginResult);

    expect(result).toEqual(successfulLoginResult);
    expect(input.silentLogin).toHaveBeenCalledTimes(1);
    expect(input.silentLogin).toHaveBeenCalledWith({});
  });
});

describe('enforceLogin', () => {
  beforeEach(() => {
    input = jasmine.createSpyObj('input',['login', 'silentLogin', 'isResponse', 'handleResponse']);
    input.loggerFactory = () => console;
    input.login = jasmine.createSpy('login').and.returnValue(Promise.reject());
    input.silentLogin = jasmine.createSpy('silentLogin').and.returnValue(Promise.reject());
    input.handleResponse = jasmine.createSpy('handleResponse').and.returnValue(failedLoginResult);
  });

  it("Login failed", done => {
    input.login = jasmine.createSpy('login').and.returnValue(Promise.resolve(failedLoginResult));

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
    expect(input.login).toHaveBeenCalledTimes(0);
  });

  it("Login success", async () => {
    input.login = jasmine.createSpy('login').and.returnValue(Promise.resolve(successfulLoginResult));

    const result = await enforceLogin(input, failedLoginResult);

    expect(result).toEqual(successfulLoginResult);
    expect(input.login).toHaveBeenCalledTimes(1);
    expect(input.login).toHaveBeenCalledWith({});
  });
});

describe('silentLoginAndThenEnforce', () => {
  beforeEach(() => {
    input = jasmine.createSpyObj('input',['login', 'silentLogin', 'isResponse', 'handleResponse']);
    input.loggerFactory = () => console;
    input.login = jasmine.createSpy('login').and.returnValue(Promise.reject());
    input.silentLogin = jasmine.createSpy('silentLogin').and.returnValue(Promise.reject());
    input.handleResponse = jasmine.createSpy('handleResponse').and.returnValue(failedLoginResult);
  });

  it("Silent Login success", async () => {
    input.silentLogin = jasmine.createSpy('silentLogin').and.returnValue(Promise.resolve(successfulLoginResult));

    const result = await silentCheckAndThenEnforce(input, failedLoginResult);

    expect(result).toEqual(successfulLoginResult);
    expect(input.silentLogin).toHaveBeenCalledTimes(1);
    expect(input.silentLogin).toHaveBeenCalledWith({});
    expect(input.login).toHaveBeenCalledTimes(0);
  });

  it("Silent Login Failed", async () => {
    input.silentLogin = jasmine.createSpy('silentLogin').and.returnValue(Promise.resolve(failedLoginResult));
    input.login = jasmine.createSpy('login').and.returnValue(Promise.resolve(successfulLoginResult));

    const result = await silentCheckAndThenEnforce(input, failedLoginResult);

    expect(result).toEqual(successfulLoginResult);
    expect(input.silentLogin).toHaveBeenCalledTimes(1);
    expect(input.silentLogin).toHaveBeenCalledWith({});
    expect(input.login).toHaveBeenCalledTimes(1);
    expect(input.login).toHaveBeenCalledWith({});
  });

  it("Both Failed", (done) => {
    input.silentLogin = jasmine.createSpy('silentLogin').and.returnValue(Promise.resolve(failedLoginResult));
    input.login = jasmine.createSpy('login').and.returnValue(Promise.resolve(failedLoginResult));

    silentCheckAndThenEnforce(input, failedLoginResult).then(() => {
      done.fail('Should not be possible');
    }).catch(e => {
      expect(e.message).toEqual('Cannot log in user');
      done();
    });
  });
});
