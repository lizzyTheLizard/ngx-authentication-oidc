import { Injectable } from "@angular/core";
import { Observable, Subject } from "rxjs";
import { TimeoutHandler } from "./timeout-handler";

/**
 * Timeout handler that never times out a session
 */
@Injectable()
export class NoTimeoutHandler implements TimeoutHandler {
  public readonly timeout$: Observable<void> = new Subject();
  public readonly timeoutWarning$: Observable<number> = new Subject();
  
  start(): void {
  }
  stop(): void {
  }
}
