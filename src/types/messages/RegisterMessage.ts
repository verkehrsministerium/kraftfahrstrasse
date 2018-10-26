import { EWampMessageID, WampDict, WampID, WampURI } from './MessageTypes';

export enum EWampMatchKind {
  EXACT = "exact",
  PREFIX = "prefix",
  WILDCARD = "wildcard",
}

export enum EWampInvocationKind {
  SINGLE = "single",
  ROUNDROBIN = "roundrobin",
  RANDOM = "random",
  FIRST = "first",
  LAST = "last",
}

export type RegisterOptions = {
  disclose_caller?: boolean;
  match?: EWampMatchKind;
  invoke?: EWampInvocationKind;
} & WampDict;

export type UnregisterDetails = {
  registration: WampID,
  reason?: string,
} & WampDict;

export type WampRegisterMessage = [EWampMessageID.REGISTER, WampID, RegisterOptions, WampURI];
export type WampRegisteredMessage = [EWampMessageID.REGISTERED, WampID, WampID];
export type WampUnregisterMessage = [EWampMessageID.UNREGISTER, WampID, WampID];
export type WampUnregisteredMessage = [EWampMessageID.UNREGISTERED, WampID, UnregisterDetails?];
