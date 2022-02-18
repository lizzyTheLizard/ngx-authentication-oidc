// eslint-disable-next-line prettier/prettier
import { TestBed } from '@angular/core/testing';
import { Idle } from '@ng-idle/core';
import { Subject } from 'rxjs';
import { AuthConfigService } from '../auth-config.service';
import { OauthConfig } from '../configuration/oauth-config';
import { InactiveTimeoutHandler } from './inactive-timeout-handler';

const config = {};

let service: InactiveTimeoutHandler;
let idleMock: any;

describe('InactiveTimeoutHandler', () => {
  beforeEach(() => {
    idleMock = jasmine.createSpyObj('idle', [
      'setIdle',
      'setIdleName',
      'setTimeout',
      'setInterrupts',
      'watch',
      'stop'
    ]);
    idleMock.onIdleStart = new Subject<void>();
    idleMock.onIdleEnd = new Subject<void>();
    idleMock.onTimeoutWarning = new Subject<number>();
    idleMock.onTimeout = new Subject<void>();
    const authConfig = new AuthConfigService(config as OauthConfig);
    TestBed.configureTestingModule({
      providers: [
        { provide: Idle, useValue: idleMock },
        { provide: AuthConfigService, useValue: authConfig },
        InactiveTimeoutHandler
      ]
    });
    service = TestBed.inject(InactiveTimeoutHandler);
  });

  it('Start / Stop', () => {
    idleMock.watch = jasmine.createSpy('watch');
    idleMock.stop = jasmine.createSpy('stop');

    service.start();
    expect(idleMock.watch).toHaveBeenCalledTimes(1);
    expect(idleMock.stop).toHaveBeenCalledTimes(0);

    service.stop();
    expect(idleMock.watch).toHaveBeenCalledTimes(1);
    expect(idleMock.stop).toHaveBeenCalledTimes(1);
  });

  it('Timeout', () => {
    let timeouts = 0;
    service.timeout$.subscribe(() => timeouts++);
    idleMock.onTimeout.next();
    expect(timeouts).toEqual(1);
  });

  it('Timeout warning', () => {
    let warnings = 0;
    service.timeoutWarning$.subscribe(() => warnings++);
    idleMock.onTimeoutWarning.next(10);
    expect(warnings).toEqual(1);
  });
});
