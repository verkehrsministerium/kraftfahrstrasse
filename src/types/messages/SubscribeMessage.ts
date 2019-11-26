import { EMatchPolicy, EWampMessageID, WampDict, WampID, WampList, WampURI } from './MessageTypes';

export type SubscribeOptions = {
  nkey?: string;
  match?: EMatchPolicy;
} & WampDict;

export type EventDetails = {
  publisher?: WampID;
  publisher_authid?: string;
  publisher_authrole?: string | string[];
  trustlevel?: number;
  topic: WampURI;
  retained?: boolean;
  publicationId?: WampID;
} & WampDict;

export type UnsubscribeDetails = {
  subscription: WampID,
  reason?: string,
} & WampDict;

export type WampSubscribeMessage = [EWampMessageID.SUBSCRIBE, WampID, SubscribeOptions, WampURI];
export type WampSubscribedMessage = [EWampMessageID.SUBSCRIBED, WampID, WampID];

export type WampUnsubscribeMessage = [EWampMessageID.UNSUBSCRIBE, WampID, WampID];
export type WampUnsubscribedMessage = [EWampMessageID.UNSUBSCRIBED, WampID, UnsubscribeDetails?];

export type WampEventMessage = [EWampMessageID.EVENT, WampID, WampID, EventDetails, WampList?, WampDict?];
