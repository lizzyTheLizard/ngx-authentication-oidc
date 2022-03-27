/* globals console */
import { LoginResult } from '../login-result';
// eslint-disable-next-line prettier/prettier
import { autoLoginIfPossible, enforceLogin, loginResponseCheck } from './initializer';
import { Prompt } from './login-options';
import { InitializerInput } from './oauth-config';

const successfulLoginResult: LoginResult = {
  isLoggedIn: true,
  userInfo: { sub: 'test' }
};
const failedLoginResult: LoginResult = { isLoggedIn: false };

let input: InitializerInput;

describe('loginResponseCheck', async () => {
  beforeEach(() => {
    input = jasmine.createSpyObj('input', ['login', 'silentLogin', 'isResponse', 'handleResponse']);
    input.loggerFactory = () => console;
  });

  it('No login response', async () => {
    input.handleResponse = jasmine
      .createSpy('handleResponse')
      .and.returnValue({ isLoggedIn: false });
    input.initialLoginResult = failedLoginResult;

    const result = await loginResponseCheck(input);

    expect(result).toEqual(failedLoginResult);
  });

  it('No login response but already logged in', async () => {
    input.handleResponse = jasmine
      .createSpy('handleResponse')
      .and.returnValue({ isLoggedIn: false });
    input.initialLoginResult = successfulLoginResult;

    const result = await loginResponseCheck(input);

    expect(result).toEqual(successfulLoginResult);
  });

  it('Successful login', async () => {
    input.handleResponse = jasmine
      .createSpy('processLoginResponse')
      .and.returnValue(successfulLoginResult);
    input.initialLoginResult = failedLoginResult;

    const result = await loginResponseCheck(input);

    expect(result).toEqual(successfulLoginResult);
  });

  it('Successful login and already logged in', async () => {
    input.handleResponse = jasmine
      .createSpy('processLoginResponse')
      .and.returnValue(successfulLoginResult);
    input.initialLoginResult = { isLoggedIn: true, userInfo: { sub: 'other' } };

    const result = await loginResponseCheck(input);

    expect(result).toEqual(successfulLoginResult);
  });
});

describe('enforceLogin', () => {
  beforeEach(() => {
    input = jasmine.createSpyObj('input', ['login', 'silentLogin', 'isResponse', 'handleResponse']);
    input.loggerFactory = () => console;
    input.login = jasmine.createSpy('login').and.callFake(() => Promise.reject());
    input.silentLogin = jasmine.createSpy('silentLogin').and.callFake(() => Promise.reject());
    input.handleResponse = jasmine.createSpy('handleResponse').and.returnValue(failedLoginResult);
  });

  it('Login failed', (done) => {
    input.login = jasmine.createSpy('login').and.returnValue(Promise.resolve(failedLoginResult));
    input.initialLoginResult = failedLoginResult;

    enforceLogin(input)
      .then(() => {
        done.fail('Should not be possible');
      })
      .catch((e) => {
        expect(e.message).toEqual('Cannot log in user');
        done();
      });
  });

  it('Already logged in', async () => {
    input.initialLoginResult = successfulLoginResult;

    const result = await enforceLogin(input);

    expect(result).toEqual(successfulLoginResult);
    expect(input.login).toHaveBeenCalledTimes(0);
  });

  it('Login success', async () => {
    input.login = jasmine
      .createSpy('login')
      .and.returnValue(Promise.resolve(successfulLoginResult));
    input.initialLoginResult = failedLoginResult;

    const result = await enforceLogin(input);

    expect(result).toEqual(successfulLoginResult);
    expect(input.login).toHaveBeenCalledTimes(1);
    expect(input.login).toHaveBeenCalledWith({});
  });
});

describe('autoLoginIfPossible with Silent Login', () => {
  beforeEach(() => {
    input = jasmine.createSpyObj('input', ['login', 'silentLogin', 'isResponse', 'handleResponse']);
    input.loggerFactory = () => console;
    input.login = jasmine.createSpy('login').and.callFake(() => Promise.reject());
    input.silentLogin = jasmine.createSpy('silentLogin').and.callFake(() => Promise.reject());
    input.handleResponse = jasmine.createSpy('handleResponse').and.returnValue(failedLoginResult);
    input.isErrorResponse = () => false;
    input.silentLoginEnabled = true;
  });

  it('Silent login failed', async () => {
    input.silentLogin = jasmine
      .createSpy('silentLogin')
      .and.returnValue(Promise.resolve(failedLoginResult));
    input.initialLoginResult = failedLoginResult;

    const result = await autoLoginIfPossible(false)(input);

    expect(result).toEqual(failedLoginResult);
    expect(input.silentLogin).toHaveBeenCalledTimes(1);
    expect(input.silentLogin).toHaveBeenCalledWith({});
  });

  it('Already logged in', async () => {
    input.initialLoginResult = successfulLoginResult;

    const result = await autoLoginIfPossible(false)(input);

    expect(result).toEqual(successfulLoginResult);
    expect(input.login).toHaveBeenCalledTimes(0);
  });

  it('Silent login success', async () => {
    input.silentLogin = jasmine
      .createSpy('silentLogin')
      .and.returnValue(Promise.resolve(successfulLoginResult));
    input.initialLoginResult = failedLoginResult;

    const result = await autoLoginIfPossible(false)(input);

    expect(result).toEqual(successfulLoginResult);
    expect(input.silentLogin).toHaveBeenCalledTimes(1);
    expect(input.silentLogin).toHaveBeenCalledWith({});
  });

  it('Enforced and Silent Login Failed', async () => {
    input.silentLogin = jasmine
      .createSpy('silentLogin')
      .and.returnValue(Promise.resolve(failedLoginResult));
    input.login = jasmine
      .createSpy('login')
      .and.returnValue(Promise.resolve(successfulLoginResult));
    input.initialLoginResult = failedLoginResult;

    const result = await autoLoginIfPossible(true)(input);

    expect(result).toEqual(successfulLoginResult);
    expect(input.silentLogin).toHaveBeenCalledTimes(1);
    expect(input.silentLogin).toHaveBeenCalledWith({});
    expect(input.login).toHaveBeenCalledTimes(1);
    expect(input.login).toHaveBeenCalledWith({});
  });

  it('Enforded and Both Failed', (done) => {
    input.silentLogin = jasmine
      .createSpy('silentLogin')
      .and.returnValue(Promise.resolve(failedLoginResult));
    input.login = jasmine.createSpy('login').and.returnValue(Promise.resolve(failedLoginResult));
    input.initialLoginResult = failedLoginResult;

    autoLoginIfPossible(true)(input)
      .then(() => {
        done.fail('Should not be possible');
      })
      .catch((e) => {
        expect(e.message).toEqual('Cannot log in user');
        done();
      });
  });
});

describe('autoLoginIfPossible without Silent Login', () => {
  beforeEach(() => {
    input = jasmine.createSpyObj('input', [
      'login',
      'isResponse',
      'handleResponse',
      'isErrorResponse'
    ]);
    input.loggerFactory = () => console;
    input.login = jasmine.createSpy('login').and.callFake(() => Promise.reject());
    input.silentLogin = jasmine.createSpy('silentLogin').and.callFake(() => Promise.reject());
    input.handleResponse = jasmine.createSpy('handleResponse').and.returnValue(failedLoginResult);
    input.silentLoginEnabled = false;
  });

  it('Redirect Login has failed', async () => {
    input.isErrorResponse = jasmine.createSpy('isErrorResponse').and.returnValue(true);
    input.initialLoginResult = failedLoginResult;

    const result = await autoLoginIfPossible(false)(input);

    expect(input.login).toHaveBeenCalledTimes(0);
    expect(result).toEqual(failedLoginResult);
  });

  it('Redirect Login failed', async () => {
    input.isErrorResponse = jasmine.createSpy('isErrorResponse').and.returnValue(false);
    input.login = jasmine.createSpy('login').and.returnValue(Promise.resolve(failedLoginResult));
    input.initialLoginResult = failedLoginResult;

    const result = await autoLoginIfPossible(false)(input);

    expect(result).toEqual(failedLoginResult);
  });

  it('Already logged in', async () => {
    input.isErrorResponse = jasmine.createSpy('isErrorResponse').and.returnValue(false);
    input.initialLoginResult = successfulLoginResult;

    const result = await autoLoginIfPossible(false)(input);

    expect(result).toEqual(successfulLoginResult);
    expect(input.login).toHaveBeenCalledTimes(0);
  });

  it('Login success', async () => {
    input.isErrorResponse = jasmine.createSpy('isErrorResponse').and.returnValue(false);
    input.login = jasmine
      .createSpy('login')
      .and.returnValue(Promise.resolve(successfulLoginResult));
    input.initialLoginResult = failedLoginResult;

    const result = await autoLoginIfPossible(false)(input);

    expect(result).toEqual(successfulLoginResult);
    expect(input.login).toHaveBeenCalledTimes(1);
    expect(input.login).toHaveBeenCalledWith({ prompts: Prompt.NONE });
  });
});
