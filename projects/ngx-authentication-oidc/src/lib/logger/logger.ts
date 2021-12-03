export interface Logger {
  debug(message?: any, ...optionalParams: any[]): void;
  info(message?: any, ...optionalParams: any[]): void;
  error(message: string, e: any, ...optionalParams: any[]): void;
}

export type LoggerFactory = (name: string) => Logger;

export const consoleLoggerFactory: LoggerFactory = (name) => { return {
  debug: (message?: any, ...optionalParams: any[]) => console.debug(name, message, optionalParams),
  info: (message?: any, ...optionalParams: any[]) => console.info(name, message, optionalParams),
  error: (message: string, e: any, ...optionalParams: any[]) => console.error(name, message, e, optionalParams),
}};
