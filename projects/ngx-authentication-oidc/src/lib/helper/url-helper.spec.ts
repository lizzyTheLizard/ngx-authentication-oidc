// eslint-disable-next-line prettier/prettier
import { TestBed } from '@angular/core/testing';
import { AuthConfigService } from '../auth-config.service';
import { WindowToken } from '../authentication-module.tokens';
import { OauthConfig } from '../configuration/oauth-config';
import { UrlHelper } from './url-helper';
import { Location } from '@angular/common';

let windowMock: Window;
let locationMock: Location;
let service: UrlHelper;

const config = {};

describe('UrlHelper', () => {
  beforeEach(() => {
    const authConfig = new AuthConfigService(config as OauthConfig);
    windowMock = {} as any;
    locationMock = {} as any;

    TestBed.configureTestingModule({
      providers: [
        { provide: Location, useValue: locationMock },
        { provide: WindowToken, useValue: windowMock },
        { provide: AuthConfigService, useValue: authConfig },
        UrlHelper
      ]
    });
    service = TestBed.inject(UrlHelper);
  });

  it('No Location to be used', () => {
    locationMock.prepareExternalUrl = jasmine
      .createSpy('prepareExternalUrl')
      .and.throwError(new Error('not possible'));
    windowMock.location = { href: 'http://localhost:9042' } as any;

    const result = service.convertToAbsoluteUrl('test').toString();

    expect(result).toEqual(windowMock.location.href + '/test');
  });

  it('No HREF to be used', () => {
    locationMock.prepareExternalUrl = jasmine
      .createSpy('prepareExternalUrl')
      .and.returnValue('https://test.com/sds');

    const result = service.convertToAbsoluteUrl('test').toString();

    expect(result).toEqual('https://test.com/sds');
  });
});
