import { WampDict, EMatchPolicy, EWampMessageID, WampList, WampID, WampURI } from './MessageTypes';

export type SubscribeOptions = {
  nkey?: string;
  match?: EMatchPolicy;
} & WampDict;

export type EventDetails = {
  publisher?: WampID;
  trustlevel?: number;
  topic?: WampURI;
} & WampDict;

export type WampSubscribeMessage = [EWampMessageID.SUBSCRIBE, WampID, SubscribeOptions, WampURI];
export type WampSubscribedMessage = [EWampMessageID.SUBSCRIBED, WampID, WampID];

export type WampUnsubscribeMessage = [EWampMessageID.UNSUBSCRIBE, WampID, WampID];
export type WampUnsubscribedMessage = [EWampMessageID.UNSUBSCRIBED, WampID];

export type WampEventMessage = [EWampMessageID.EVENT, WampID, WampID, EventDetails, WampList?, WampDict?];
