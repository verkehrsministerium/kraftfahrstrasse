import { IAuthProvider } from './AuthProvider';
import { ISerializer } from './Serializer';
import { ITransportFactory } from './Transport';

import { WampDict, WampID, WampList } from './messages/MessageTypes';

import { CallOptions, ECallKillMode, InvocationDetails } from './messages/CallMessage';
import { PublishOptions } from './messages/PublishMessage';
import { RegisterOptions } from './messages/RegisterMessage';
import { SubscribeOptions } from './messages/SubscribeMessage';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
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
  args: TArgs;
  kwArgs: TKwArgs;
  nextResult?: Promise<CallResult<TArgs, TKwArgs>> | null;
};

export type CallHandler<
  TA extends WampList,
  TKwA extends WampDict,
  TRA extends WampList,
  TRKwA extends WampDict
> = (args: TA, kwArgs: TKwA, details: InvocationDetails) => Promise<CallResult<TRA, TRKwA>>;

export type EventHandler<TA extends WampList, TKwA extends WampDict> = (args: TA, kwArgs: TKwA, details: any) => void;

export interface IRegistration {
  Unregister(): Promise<void>;
  OnUnregistered(): Promise<void>;
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
  CancelCall(callid: WampID, mode: ECallKillMode): void;

  Call<
    A extends WampList,
    K extends WampDict,
    RA extends WampList,
    RK extends WampDict
  >(uri: string, args?: A, kwArgs?: K, options?: CallOptions): [Promise<CallResult<RA, RK>>, WampID];

  Register<
    A extends WampList,
    K extends WampDict,
    RA extends WampList,
    RK extends WampDict
  >(uri: string, handler: CallHandler<A, K, RA, RK>, options?: RegisterOptions): Promise<IRegistration>;

  Publish<
    A extends WampList,
    K extends WampDict
  >(topic: string, args?: A, kwArgs?: K, options?: PublishOptions): Promise<IPublication>;

  Subscribe<
    A extends WampList,
    K extends WampDict
  >(topic: string, handler: EventHandler<A, K>, options?: SubscribeOptions): Promise<ISubscription>;
}
