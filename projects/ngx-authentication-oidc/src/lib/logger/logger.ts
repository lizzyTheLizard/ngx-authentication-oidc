import { InjectionToken } from '@angular/core';

export const LoggerFactoryToken = new InjectionToken('LoggerFactory');

export interface Logger {
  debug(message: string, ...optionalParams: any[]): void;
  info(message: string, ...optionalParams: any[]): void;
  error(message: string, e?: Error | unknown, ...optionalParams: any[]): void;
}

export type LoggerFactory = (name: string) => Logger;
