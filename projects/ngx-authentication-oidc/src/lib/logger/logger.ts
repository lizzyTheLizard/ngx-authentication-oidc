import { InjectionToken } from '@angular/core';

export const LoggerFactoryToken = new InjectionToken('LoggerFactory');

export interface Logger {
  debug(message: string, ...optionalParams: any[]): void;
  info(message: string, ...optionalParams: any[]): void;
  error(message: string, e?: Error | unknown, ...optionalParams: any[]): void;
}

export type LoggerFactory = (name: string) => Logger;

class ConsoleLogger implements Logger {
  constructor(private readonly name: string) {}
  debug = console.debug.bind(console, this.name + ': %s');
  info = console.info.bind(console, this.name + ': %s');
  warn = console.warn.bind(console, this.name + ': %s');
  error = console.error.bind(console, this.name + ': %s');
}

export const consoleLoggerFactory: LoggerFactory = (name) =>
  new ConsoleLogger(name);
