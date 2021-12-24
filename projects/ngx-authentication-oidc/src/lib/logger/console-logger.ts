import { Logger, LoggerFactory } from "./logger";

class ConsoleLogger implements Logger{
  constructor(private readonly name: string) {}
  debug = console.debug.bind(console, this.name + ": %s");
  info = console.info.bind(console, this.name + ": %s");
  warn = console.warn.bind(console, this.name + ": %s");
  error = console.error.bind(console, this.name + ": %s");
}

export const consoleLoggerFactory: LoggerFactory = (name) => new ConsoleLogger(name);
