import {EWampMessageID, WampDict, WampID} from './MessageTypes';

export type WelcomeDetails = {
  roles: {
    broker: {},
    dealer: {},
  },
  agent?: string,
  authid?: string,
  authrole?: string | string[],
  authmethod?: string,
  authprovider?: string,
  authextra?: WampDict,
};

export type WampWelcomeMessage = [EWampMessageID.WELCOME, WampID, WelcomeDetails];
