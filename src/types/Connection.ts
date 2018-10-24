import { IAuthProvider } from "./AuthProvider";
import { WampID, WampDict } from "./messages/MessageTypes";
import { PublishOptions } from "./messages/PublishMessage";
import { ISerializer } from "./Serializer";
import { ITransportFactory } from "./Transport";

export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARNING = "WARNING",
  ERROR = "ERROR",
}

export class ConnectionOpenError extends Error {
  constructor(reason: string, public details?: WampDict) {
    super(reason);
  }
}
export class ConnectionCloseError extends Error {
  constructor(reason: string, public code: number) {
    super(reason);
  }
}

export type ConnectionCloseInfo = {
  reason: string;
  code: number;
  wasClean: boolean;
};

export type LogFunction = (logLevel: LogLevel, timestamp: Date, fileName: string, logText: string) => void;
export type ConnectionOptions = {
  endpoint: string;
  serializer: ISerializer;
  transport: ITransportFactory;
  authProvider: IAuthProvider;
  realm: string;
  logFunction?: LogFunction;
  transportOptions?: WampDict;
};

export type CallResult<TArgs, TKwArgs> = {
  Args: TArgs;
  KwArgs: TKwArgs;
};

export type CallHandler<TA, TKwA, TRA, TRKwA> = (args: TA, kwArgs: TKwA, details: any) => CallResult<TRA, TRKwA>;
export type EventHandler<TA, TKwA> = (args: TA, kwArgs: TKwA, details: any) => void;

export interface IRegistration {
  Unregister(): Promise<void>;
  OnUnregister(): Promise<void>;
  ID(): WampID;
}

export interface ISubscription {
  Unsubscribe(): Promise<void>;
  OnUnsubscribe(): Promise<void>;
  ID(): WampID;
}

export interface IPublication {
  OnPublished(): Promise<WampID>;
}

export interface IConnection {
  Open(): Promise<void>;
  Close(): Promise<ConnectionCloseInfo>;
  OnClose(): Promise<ConnectionCloseInfo>;

  // TODO: Add methods to allow feature queries

  Call<A, K, RA, RK>(uri: string, args: A, kwArgs: K, options: any): Promise<CallResult<RA, RK>>;
  Register<A, K, RA, RK>(uri: string, handler: CallHandler<A, K, RA, RK>, options: any): Promise<IRegistration>;
  Publish<A, K>(topic: string, args: A, kwArgs: K, options: PublishOptions): Promise<IPublication>;
  Subscribe<A, K>(topic: string, handler: EventHandler<A, K>, options: any): Promise<ISubscription>;
}
