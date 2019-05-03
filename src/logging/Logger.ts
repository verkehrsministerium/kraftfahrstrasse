import { LogFunction, LogLevel } from '..';

class Logger {

  public fileName: string;
  public logFunction?: LogFunction;

  constructor(fileName: string, logFunction ?: LogFunction) {
    this.fileName = fileName;
    this.logFunction = logFunction;

    if (!this.logFunction) {
      this.log(LogLevel.WARNING, 'Fallback to internal log function. It is recommended to use an own log function.');
    }

  }

  public log(logLevel: LogLevel, logContent: any) {

    if (this.logFunction) {
      this.logFunction(logLevel, new Date(), this.fileName, logContent);
    } else {
      // tslint:disable-next-line:no-console
      console.log(`[${logLevel}][${new Date().toUTCString()}][${this.fileName}] ${logContent}`);
    }

  }

}

export default Logger;
