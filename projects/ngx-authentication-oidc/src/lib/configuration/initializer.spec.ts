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

    const initializer = loginResponseCheck();
    const result = await initializer(input);

    expect(result).toEqual(failedLoginResult);
  });

  it('No login response but already logged in', async () => {
    input.handleResponse = jasmine
      .createSpy('handleResponse')
      .and.returnValue({ isLoggedIn: false });
    input.initialLoginResult = successfulLoginResult;

    const initializer = loginResponseCheck();
    const result = await initializer(input);

    expect(result).toEqual(successfulLoginResult);
  });

  it('Successful login', async () => {
    input.handleResponse = jasmine
      .createSpy('processLoginResponse')
      .and.returnValue(successfulLoginResult);
    input.initialLoginResult = failedLoginResult;

    const initializer = loginResponseCheck();
    const result = await initializer(input);

    expect(result).toEqual(successfulLoginResult);
  });

  it('Successful login and already logged in', async () => {
    input.handleResponse = jasmine
      .createSpy('processLoginResponse')
      .and.returnValue(successfulLoginResult);
    input.initialLoginResult = { isLoggedIn: true, userInfo: { sub: 'other' } };

    const initializer = loginResponseCheck();
    const result = await initializer(input);

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

    const initializer = enforceLogin({});
    initializer(input)
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

    const initializer = enforceLogin({});
    const result = await initializer(input);

    expect(result).toEqual(successfulLoginResult);
    expect(input.login).toHaveBeenCalledTimes(0);
  });

  it('Login success', async () => {
    input.login = jasmine
      .createSpy('login')
      .and.returnValue(Promise.resolve(successfulLoginResult));
    input.initialLoginResult = failedLoginResult;

    const initializer = enforceLogin({});
    const result = await initializer(input);

    expect(result).toEqual(successfulLoginResult);
    expect(input.login).toHaveBeenCalledTimes(1);
    expect(input.login).toHaveBeenCalledWith({});
  });

  it('Login options', async () => {
    input.login = jasmine
      .createSpy('login')
      .and.returnValue(Promise.resolve(successfulLoginResult));
    input.initialLoginResult = failedLoginResult;
    const loginOptions = { scope: ['1', '2'] };

    const initializer = enforceLogin(loginOptions);
    const result = await initializer(input);

    expect(result).toEqual(successfulLoginResult);
    expect(input.login).toHaveBeenCalledTimes(1);
    expect(input.login).toHaveBeenCalledWith(loginOptions);
  });
});

describe('autoLoginIfPossible', () => {
  beforeEach(() => {
    input = jasmine.createSpyObj('input', [
      'login',
      'silentLogin',
      'isResponse',
      'handleResponse',
      'isErrorResponse'
    ]);
    input.loggerFactory = () => console;
    input.login = jasmine.createSpy('login').and.callFake(() => Promise.reject());
    input.silentLogin = jasmine.createSpy('silentLogin').and.callFake(() => Promise.reject());
    input.handleResponse = jasmine.createSpy('handleResponse').and.returnValue(failedLoginResult);
    input.isErrorResponse = jasmine.createSpy('isErrorResponse').and.returnValue(false);
    input.silentLoginEnabled = true;
  });

  it('Silent login failed', async () => {
    input.silentLogin = jasmine
      .createSpy('silentLogin')
      .and.returnValue(Promise.resolve(failedLoginResult));
    input.initialLoginResult = failedLoginResult;

    const initializer = autoLoginIfPossible({}, false);
    const result = await initializer(input);

    expect(result).toEqual(failedLoginResult);
    expect(input.silentLogin).toHaveBeenCalledTimes(1);
    expect(input.silentLogin).toHaveBeenCalledWith({});
  });

  it('Already logged in', async () => {
    input.initialLoginResult = successfulLoginResult;

    const initializer = autoLoginIfPossible({}, false);
    const result = await initializer(input);

    expect(result).toEqual(successfulLoginResult);
    expect(input.login).toHaveBeenCalledTimes(0);
  });

  it('Silent login success', async () => {
    input.silentLogin = jasmine
      .createSpy('silentLogin')
      .and.returnValue(Promise.resolve(successfulLoginResult));
    input.initialLoginResult = failedLoginResult;

    const initializer = autoLoginIfPossible({}, false);
    const result = await initializer(input);

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

    const initializer = autoLoginIfPossible({}, true);
    const result = await initializer(input);

    expect(result).toEqual(successfulLoginResult);
    expect(input.silentLogin).toHaveBeenCalledTimes(1);
    expect(input.silentLogin).toHaveBeenCalledWith({});
    expect(input.login).toHaveBeenCalledTimes(1);
    expect(input.login).toHaveBeenCalledWith({});
  });

  it('Enforced and Both Failed', (done) => {
    input.silentLogin = jasmine
      .createSpy('silentLogin')
      .and.returnValue(Promise.resolve(failedLoginResult));
    input.login = jasmine.createSpy('login').and.returnValue(Promise.resolve(failedLoginResult));
    input.initialLoginResult = failedLoginResult;

    const initializer = autoLoginIfPossible({}, true);
    initializer(input)
      .then(() => {
        done.fail('Should not be possible');
      })
      .catch((e) => {
        expect(e.message).toEqual('Cannot log in user');
        done();
      });
  });

  it('Login options', async () => {
    input.silentLogin = jasmine
      .createSpy('silentLogin')
      .and.returnValue(Promise.resolve(successfulLoginResult));
    input.initialLoginResult = failedLoginResult;
    const loginOptions = { scope: ['1', '2'] };

    const initializer = autoLoginIfPossible(loginOptions, false);
    const result = await initializer(input);

    expect(result).toEqual(successfulLoginResult);
    expect(input.silentLogin).toHaveBeenCalledTimes(1);
    expect(input.silentLogin).toHaveBeenCalledWith(loginOptions);
  });

  it('Redirect Login has failed without silent Login', async () => {
    input.isErrorResponse = jasmine.createSpy('isErrorResponse').and.returnValue(true);
    input.initialLoginResult = failedLoginResult;
    input.silentLoginEnabled = false;

    const initializer = autoLoginIfPossible({}, false);
    const result = await initializer(input);

    expect(input.login).toHaveBeenCalledTimes(0);
    expect(result).toEqual(failedLoginResult);
  });

  it('Redirect Login failed without silent Login', async () => {
    input.login = jasmine.createSpy('login').and.returnValue(Promise.resolve(failedLoginResult));
    input.initialLoginResult = failedLoginResult;
    input.silentLoginEnabled = false;

    const initializer = autoLoginIfPossible({}, false);
    const result = await initializer(input);

    expect(result).toEqual(failedLoginResult);
  });

  it('Already logged in without silent Login', async () => {
    input.initialLoginResult = successfulLoginResult;
    input.silentLoginEnabled = false;

    const initializer = autoLoginIfPossible({}, false);
    const result = await initializer(input);

    expect(result).toEqual(successfulLoginResult);
    expect(input.login).toHaveBeenCalledTimes(0);
  });

  it('Login success without silent Login', async () => {
    input.login = jasmine
      .createSpy('login')
      .and.returnValue(Promise.resolve(successfulLoginResult));
    input.initialLoginResult = failedLoginResult;
    input.silentLoginEnabled = false;

    const initializer = autoLoginIfPossible({}, false);
    const result = await initializer(input);

    expect(result).toEqual(successfulLoginResult);
    expect(input.login).toHaveBeenCalledTimes(1);
    expect(input.login).toHaveBeenCalledWith({ prompts: Prompt.NONE });
  });

  it('Login options without silent Login', async () => {
    input.login = jasmine
      .createSpy('login')
      .and.returnValue(Promise.resolve(successfulLoginResult));
    input.initialLoginResult = failedLoginResult;
    input.silentLoginEnabled = false;
    const loginOptions = { scope: ['1', '2'] };

    const initializer = autoLoginIfPossible(loginOptions, false);
    const result = await initializer(input);

    expect(result).toEqual(successfulLoginResult);
    expect(input.login).toHaveBeenCalledTimes(1);
    expect(input.login).toHaveBeenCalledWith({ prompts: Prompt.NONE, ...loginOptions });
  });
});
