/* global setInterval, clearInterval*/
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { DocumentToken, WindowToken } from '../authentication-module.tokens';
import { OidcSessionManagement } from './oidc-session-management';
import { AuthConfigService } from '../auth-config.service';
import { OauthConfig } from '../configuration/oauth-config';

const config = {
  provider: {
    checkSessionIframe: 'https://example.com/sc'
  },
  clientId: 'id'
};

let eventListener: EventListener;

const windowMock = {
  addEventListener: jasmine
    .createSpy('addEventListener')
    .and.callFake((m, l) => (eventListener = l)),
  removeEventListener: jasmine.createSpy('removeEventListener'),
  postMessage: jasmine.createSpy('postMessage'),
  setInterval: (a: () => void, b: number) => setInterval(a, b),
  clearInterval: (a: number) => clearInterval(a),
  location: { href: 'http://localhost', origin: 'http://localhost' }
};

const iframeMock = {
  setAttribute: jasmine.createSpy('setAttribute'),
  getAttribute: jasmine.createSpy('getAttribute').and.returnValue('https://example.com'),
  contentWindow: {
    postMessage: jasmine.createSpy('postMessage')
  },
  style: new Map()
};

const documentMock = {
  body: jasmine.createSpyObj('body', ['appendChild', 'removeChild']),
  createElement: jasmine.createSpy('createElement').and.returnValue(iframeMock)
};

let service: OidcSessionManagement;

describe('OidcSessionManagement', () => {
  beforeEach(() => {
    const authConfig = new AuthConfigService(config as OauthConfig);
    TestBed.configureTestingModule({
      providers: [
        { provide: WindowToken, useValue: windowMock },
        { provide: DocumentToken, useValue: documentMock },
        { provide: AuthConfigService, useValue: authConfig },
        OidcSessionManagement
      ]
    });
    service = TestBed.inject(OidcSessionManagement);
  });

  it('Post message to opIframe when watching', fakeAsync(() => {
    iframeMock.contentWindow.postMessage.calls.reset();

    const watch = service.watchSession('123-123');
    tick(11000);

    expect(iframeMock.contentWindow.postMessage).toHaveBeenCalledTimes(1);
    expect(iframeMock.contentWindow.postMessage).toHaveBeenCalledWith(
      config.clientId + ' ' + '123-123',
      'https://example.com'
    );

    iframeMock.contentWindow.postMessage.calls.reset();
    service.stopWatching(watch);
    tick(11000);

    expect(iframeMock.contentWindow.postMessage).toHaveBeenCalledTimes(0);
  }));

  it('Notification if session changed', () => {
    const updateToken = jasmine.createSpy('updateToken');
    iframeMock.contentWindow.postMessage.calls.reset();

    const result = service.watchSession('123-123');
    result.subscribe(() => updateToken());
    eventListener(
      new MessageEvent('message', {
        origin: 'https://example.com',
        data: 'changed'
      })
    );

    expect(updateToken).toHaveBeenCalledTimes(1);
  });

  it('Notification if error', () => {
    const updateToken = jasmine.createSpy('updateToken');
    iframeMock.contentWindow.postMessage.calls.reset();

    const result = service.watchSession('123-123');
    result.subscribe(() => updateToken());
    eventListener(
      new MessageEvent('message', {
        origin: 'https://example.com',
        data: 'error'
      })
    );

    expect(updateToken).toHaveBeenCalledTimes(1);
  });
});
