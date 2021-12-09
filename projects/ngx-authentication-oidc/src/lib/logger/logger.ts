export interface Logger {
  debug(message?: any, ...optionalParams: any[]): void;
  info(message?: any, ...optionalParams: any[]): void;
  error(message: string, e: any, ...optionalParams: any[]): void;
}

export type LoggerFactory = (name: string) => Logger;


//TODO: Better logger, this adds wrong lines
export const consoleLoggerFactory: LoggerFactory = (name) => { return {
  debug: (message?: any, ...optionalParams: any[]) => {
    if(optionalParams.length == 0) {
      console.debug(name, message);
    } else {
      console.debug(name, message, optionalParams);
    }
  },
  info: (message?: any, ...optionalParams: any[]) => {
    if(optionalParams.length == 0) {
      console.info(name, message);
    } else {
      console.info(name, message, optionalParams);
    }
  },
  error: (message: any, e: any, ...optionalParams: any[]) => {
    if(optionalParams.length == 0) {
      console.error(name, message, e);
    } else {
      console.error(name, message, e, optionalParams);
    }
  },
}};
