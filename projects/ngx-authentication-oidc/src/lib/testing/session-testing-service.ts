import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * A testing service that can be used in your unit tests. This will be injected instead of
 * {@link SessionService} when {@link AuthenticationTestingModule} is imported.
 */
@Injectable()
export class SessionTestingService {
  /** Observable to check for inactive timeout warnings */
  public readonly secondsUntilTimeout$: Subject<number | undefined>;

  constructor() {
    this.secondsUntilTimeout$ = new Subject<number | undefined>();
  }

  public async updateToken(): Promise<void> {
    // Nothing to do here
    return;
  }
}
