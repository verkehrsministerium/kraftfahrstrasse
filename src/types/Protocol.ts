export enum EWampMessageID {
  HELLO = 1,
  WELCOME = 2,
  ABORT = 3,
  CHALLENGE = 4,
  AUTHENTICATE = 5,
  GOODBYE = 6,
  ERROR = 8,
  PUBLISH = 16,
  PUBLISHED = 17,
  SUBSCRIBE = 32,
  SUBSCRIBED = 33,
  UNSUBSCRIBE = 34,
  UNSUBSCRIBED = 35,
  EVENT = 36,
  CALL = 48,
  CANCEL = 49,
  RESULT = 50,
  REGISTER = 64,
  REGISTERED = 65,
  UNREGISTER = 66,
  UNREGISTERED = 67,
  INVOCATION = 68,
  INTERRUPT = 69,
  YIELD = 70,
}
export type WampID = number;
export type WampURI = string;
export type WampDict = {
  [key: string]: any;
}
export type WampList = Array<any>;
export type WampHelloMessage = [EWampMessageID.HELLO, WampURI, WampDict];
export type WampWelcomeMessage = [EWampMessageID.WELCOME, WampID, WampDict];
export type WampAbortMessage = [EWampMessageID.ABORT, WampDict, WampURI];
export type WampGoodbyeMessage = [EWampMessageID.GOODBYE, WampDict, WampURI];
export type WampErrorMessage = [EWampMessageID.ERROR, EWampMessageID, WampID, WampDict, WampURI, WampList?, WampDict?];
export type WampMessage =
  WampHelloMessage |
  WampWelcomeMessage |
  WampAbortMessage |
  WampGoodbyeMessage |
  WampErrorMessage;

export type CallOptions = {
  ReceiveProgress: boolean;

}
