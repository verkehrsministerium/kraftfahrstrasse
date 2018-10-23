import { EWampMessageID, WampID } from './MessageTypes';

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
};

export type WampWelcomeMessage = [EWampMessageID.WELCOME, WampID, WelcomeDetails];
