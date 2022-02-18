import { Logger, LoggerFactory } from '../configuration/oauth-config';

class ConsoleLogger implements Logger {
  constructor(private readonly name: string) {}
  debug = console.debug.bind(console, this.name + ': %s');
  info = console.info.bind(console, this.name + ': %s');
  warn = console.warn.bind(console, this.name + ': %s');
  error = console.error.bind(console, this.name + ': %s');
}

// eslint-disable-next-line valid-jsdoc
/**
 * A {@link Logger} that just logs to the console
 */
export const consoleLoggerFactory: LoggerFactory = (name) =>
  new ConsoleLogger(name);
