import { Injectable, InjectionToken } from '@angular/core';
import { Observable, Subject } from 'rxjs';

/**
 * The timeout handler terminates user sessions after a timeout. You can either
 * chose one of the existing implementations ({@link InactiveSessionHandler} or {@link UpdateSessionHandler})
 * or provide your own
 */
export const TimeoutHandlerToken = new InjectionToken('SessionHandler');

export interface TimeoutHandler {
  /**
   * Observable that emits when the session timed out
   */
  readonly timeout$: Observable<void>;
  /**
   * Observable that emits before the session times out, giving you the number of seconds until timeout
   */
  readonly timeoutWarning$: Observable<number>;

  /**
   * Start checking for timeout
   */
  start(): void;

  /**
   * Stop checking for timeout
   */
  stop(): void;
}

/**
 * Timeout handler that never times out a session
 */
@Injectable()
export class NoTimeoutHandler implements TimeoutHandler {
  public readonly timeout$: Observable<void> = new Subject();
  public readonly timeoutWarning$: Observable<number> = new Subject();

  start(): void {}
  stop(): void {}
}
