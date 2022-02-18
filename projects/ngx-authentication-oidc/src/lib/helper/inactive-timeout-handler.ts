import { Injectable } from '@angular/core';
import { Idle } from '@ng-idle/core';
import { AuthConfigService } from '../auth-config.service';
import { Logger } from '../configuration/oauth-config';
import { Observable, Subject } from 'rxjs';

@Injectable()
export class InactiveTimeoutHandler {
  private readonly logger: Logger;
  private readonly timeoutSub: Subject<void>;
  private readonly timeoutWarningSub: Subject<number>;
  public readonly timeout$: Observable<void>;
  public readonly timeoutWarning$: Observable<number>;

  constructor(
    private readonly idle: Idle,
    private readonly config: AuthConfigService
  ) {
    this.logger = this.config.loggerFactory('InactiveTimeoutHandler');
    this.timeoutSub = new Subject();
    this.timeout$ = this.timeoutSub.asObservable();
    this.timeoutWarningSub = new Subject();
    this.timeoutWarning$ = this.timeoutWarningSub.asObservable();

    if (!this.config.inactiveTimeout.enabled) {
      this.logger.debug('Inactive timeout is disabled');
      return;
    }
    this.logger.debug('Inactive timeout is enabled');

    this.idle.setIdle(this.config.inactiveTimeout.idleTimeSeconds);
    this.idle.setIdleName('InactiveTimeoutHandler');
    this.idle.setTimeout(this.config.inactiveTimeout.timeoutSeconds);
    this.idle.setInterrupts(this.config.inactiveTimeout.interrupts);
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
      'User is idle, you will be logged out in ' + secondsLeft + ' seconds'
    );
    this.timeoutWarningSub.next(secondsLeft);
  }

  start(): void {
    if (!this.config.inactiveTimeout.enabled) {
      return;
    }
    this.idle.watch();
  }

  stop(): void {
    if (!this.config.inactiveTimeout.enabled) {
      return;
    }
    this.idle.stop();
  }
}
