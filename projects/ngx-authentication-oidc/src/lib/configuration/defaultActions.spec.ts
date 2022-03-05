import { LogoutActionInput } from './oauth-config';
import { redirect, singleLogout, singleLogoutOrRedirect } from './defaultActions';

describe('DefaultActions', async () => {
  it('singleLogout', async () => {
    const input: LogoutActionInput = {
      oldResult: { isLoggedIn: false },
      loggerFactory: () => console,
      singleLogout: jasmine.createSpy('singleLogout'),
      router: jasmine.createSpyObj('Router', ['navigateByUrl'])
    };

    const method = singleLogout('singleLogout');
    await method(input);

    expect(input.singleLogout).toHaveBeenCalledTimes(1);
    expect(input.singleLogout).toHaveBeenCalledWith('singleLogout');
  });

  it('redirect', async () => {
    const input: LogoutActionInput = {
      oldResult: { isLoggedIn: false },
      loggerFactory: () => console,
      singleLogout: jasmine.createSpy('singleLogout'),
      router: jasmine.createSpyObj('Router', ['navigateByUrl'])
    };

    const method = redirect('redirect');
    await method(input);

    expect(input.router.navigateByUrl).toHaveBeenCalledTimes(1);
    expect(input.router.navigateByUrl).toHaveBeenCalledWith('redirect');
  });

  it('singleLogoutOrRedirect fails', async () => {
    const input: LogoutActionInput = {
      oldResult: { isLoggedIn: false },
      loggerFactory: () => console,
      singleLogout: jasmine.createSpy('singleLogout').and.returnValue(Promise.resolve(false)),
      router: jasmine.createSpyObj('Router', ['navigateByUrl'])
    };

    const method = singleLogoutOrRedirect('redirect', 'singleLogout');
    await method(input);

    expect(input.singleLogout).toHaveBeenCalledTimes(1);
    expect(input.singleLogout).toHaveBeenCalledWith('singleLogout');
    expect(input.router.navigateByUrl).toHaveBeenCalledTimes(1);
    expect(input.router.navigateByUrl).toHaveBeenCalledWith('redirect');
  });

  it('singleLogoutOrRedirect works', async () => {
    const input: LogoutActionInput = {
      oldResult: { isLoggedIn: false },
      loggerFactory: () => console,
      singleLogout: jasmine.createSpy('singleLogout').and.returnValue(Promise.resolve(true)),
      router: jasmine.createSpyObj('Router', ['navigateByUrl'])
    };

    const method = singleLogoutOrRedirect('redirect', 'singleLogout');
    await method(input);

    expect(input.singleLogout).toHaveBeenCalledTimes(1);
    expect(input.singleLogout).toHaveBeenCalledWith('singleLogout');
    expect(input.router.navigateByUrl).toHaveBeenCalledTimes(0);
  });
});
