import { EWampMessageID, WampID, WampURI, WampList, WampDict } from './MessageTypes';
export type PublishOptions = {
  acknowledge?: boolean;
  exclude_me?: boolean;
  disclose_me?: boolean;
  rkey?: boolean;
  exclude?: WampID[];
  exclude_authrole?: string[];
  exclude_authid?: string[];
  eligible?: WampID[];
  eligible_authrole?: string[];
  eligible_authid?: string[];
} & WampDict;

// [PUBLISH, RequestID, Options, Topic, Args, KwArgs]
export type WampPublishMessage = [EWampMessageID.PUBLISH, WampID, PublishOptions, WampURI, WampList?, WampDict?];

// [PUBLISHED, RequestID, PublicationID]
export type WampPublishedMessage = [EWampMessageID.PUBLISHED, WampID, WampID];
