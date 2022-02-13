import { InterruptSource } from '@ng-idle/core';

export interface IdleConfiguration {
  idleTimeSeconds: number;
  timeoutSeconds: number;
  interruptsSource: Array<InterruptSource>;
}
