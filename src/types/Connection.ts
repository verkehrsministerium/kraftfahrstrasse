import {IAuthProvider} from "./AuthProvider";
import {WampID} from "./messages/MessageTypes";
import {ISerializer} from "./Serializer";
import {ITransportFactory} from "./Transport";

export enum LogLevel {
    DEBUG = "DEBUG",
    INFO = "INFO",
    WARNING = "WARNING",
    ERROR = "ERROR",
}

type LogFunction = (logLevel: LogLevel, timestamp: Date, fileName: string, logText: string) => void;

export interface ConnectionOptions {
    endpoint: string;
    serializer: ISerializer;
    transport: ITransportFactory;
    transportOptions: {
        [key: string]: any;
    };
    logFunction?: LogFunction;
}

export interface CallResult<TArgs, TKwArgs> {
    Args: TArgs;
    KwArgs: TKwArgs;
}
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
    OnPublished(): Promise<void>;

    ID(): WampID;
}

export interface IConnection {
    Open(): Promise<void>;

    Close(): Promise<void>;

    // TODO: Add methods to allow feature queries

    Call<TArgs, TKwArgs, TRetArgs, TRetKwArgs>(uri: string, args: TArgs, kwArgs: TKwArgs, options: any): Promise<CallResult<TRetArgs, TRetKwArgs>>;

    Register<TA, TKwA, TRA, TRKwA>(uri: string, handler: CallHandler<TA, TKwA, TRA, TRKwA>, options: any): Promise<IRegistration>;

    Publish<TArgs, TKwArgs>(topic: string, args: TArgs, kwArgs: TKwArgs, options: any): Promise<IPublication>;

    Subscribe<TArgs, TKwArgs>(topic: string, handler: EventHandler<TArgs, TKwArgs>, options: any): Promise<ISubscription>;
}
