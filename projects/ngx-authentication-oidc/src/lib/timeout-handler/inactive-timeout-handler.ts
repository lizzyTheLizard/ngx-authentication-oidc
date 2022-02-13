import { Inject, Injectable } from '@angular/core';
import { TimeoutHandler } from './timeout-handler';
import { Idle } from '@ng-idle/core';
import { AuthConfigService } from '../auth-config.service';
import { Logger, LoggerFactory, LoggerFactoryToken } from '../logger/logger';
import { Observable, Subject } from 'rxjs';

/**
 * Timeout handler that times out if the user is inactive
 */
//TODO: Add tests for {@link InactiveTimeoutHandler}
@Injectable()
export class InactiveTimeoutHandler implements TimeoutHandler {
  private readonly logger: Logger;
  private readonly timeoutSub: Subject<void>;
  private readonly timeoutWarningSub: Subject<number>;
  public readonly timeout$: Observable<void>;
  public readonly timeoutWarning$: Observable<number>;

  constructor(
    private readonly idle: Idle,
    private readonly config: AuthConfigService,
    @Inject(LoggerFactoryToken) loggerFactory: LoggerFactory
  ) {
    this.logger = loggerFactory('InactiveTimeoutHandler');
    this.timeoutSub = new Subject();
    this.timeout$ = this.timeoutSub.asObservable();
    this.timeoutWarningSub = new Subject();
    this.timeoutWarning$ = this.timeoutWarningSub.asObservable();

    this.idle.setIdle(this.config.idleConfiguration.idleTimeSeconds);
    this.idle.setIdleName('InactiveTimeoutHandler');
    this.idle.setTimeout(this.config.idleConfiguration.timeoutSeconds);
    this.idle.setInterrupts(this.config.idleConfiguration.interruptsSource);
    this.idle.onIdleStart.subscribe(() => this.logger.debug('User is idle'));
    this.idle.onIdleEnd.subscribe(() =>
      this.logger.debug('User is not idle any more')
    );
    this.idle.onTimeoutWarning.subscribe((countdown) =>
      this.timeoutWarning(countdown)
    );
    this.idle.onTimeout.subscribe(() => this.timeout());
  }

  private timeout() {
    this.logger.debug('User will be logged out as he was idle to long');
    this.timeoutSub.next();
  }

  private timeoutWarning(secondsLeft: number) {
    this.logger.debug(
      'User is idle, you will be logged out in' + secondsLeft + ' seconds'
    );
    this.timeoutWarningSub.next(secondsLeft);
  }

  start(): void {
    this.idle.watch();
  }

  stop(): void {
    this.idle.stop();
  }
}
