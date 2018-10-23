import { EWampMessageID, WampURI } from './MessageTypes';

export type HelloMessageDetails = {
  roles: {
    publisher: {},
    subscriber: {},
    caller: {},
    callee: {},
  },
  agent?: string,
  authmethods?: string[],
  authid?: string,
};

export type WampHelloMessage = [EWampMessageID.HELLO, WampURI, HelloMessageDetails];
