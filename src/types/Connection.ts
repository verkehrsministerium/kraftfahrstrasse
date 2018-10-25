import { IAuthProvider } from "./AuthProvider";
import { WampID, WampDict, WampList } from "./messages/MessageTypes";
import { PublishOptions } from "./messages/PublishMessage";
import { SubscribeOptions } from './messages/SubscribeMessage';
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

export type CallResult<TArgs extends WampList, TKwArgs extends WampDict> = {
  Args: TArgs;
  KwArgs: TKwArgs;
};

export type CallHandler<TA extends WampList, TKwA extends WampDict, TRA extends WampList, TRKwA extends WampDict> = (args: TA, kwArgs: TKwA, details: any) => CallResult<TRA, TRKwA>;
export type EventHandler<TA extends WampList, TKwA extends WampDict> = (args: TA, kwArgs: TKwA, details: any) => void;

export interface IRegistration {
  Unregister(): Promise<void>;
  OnUnregister(): Promise<void>;
  ID(): WampID;
}

export interface ISubscription {
  Unsubscribe(): Promise<void>;
  OnUnsubscribed(): Promise<void>;
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

  Call<A extends WampList, K extends WampDict, RA extends WampList, RK extends WampDict>(uri: string, args: A, kwArgs: K, options: any): Promise<CallResult<RA, RK>>;
  Register<A extends WampList, K extends WampDict, RA extends WampList, RK extends WampDict>(uri: string, handler: CallHandler<A, K, RA, RK>, options: any): Promise<IRegistration>;
  Publish<A extends WampList, K extends WampDict>(topic: string, args: A, kwArgs: K, options: PublishOptions): Promise<IPublication>;
  Subscribe<A extends WampList, K extends WampDict>(topic: string, handler: EventHandler<A, K>, options: SubscribeOptions): Promise<ISubscription>;
}
