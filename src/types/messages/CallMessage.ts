import { EWampMessageID, WampID, WampURI, WampDict, WampList } from './MessageTypes';

export enum ECallRunMode {
  PARTITION = 'partition',
  ALL = '',
}
export type CallOptions = {
  receive_progress?: boolean;
  timeout?: number;
  disclose_me?: boolean;
  runmode?: ECallRunMode;
  rkey?: string;
} & WampDict;

export type CallResultOptions = {
  progress?: boolean;
} & WampDict;

export enum ECallKillMode {
  SKIP = 'skip',
  KILL = 'kill',
  KILLNOWAIT = 'killnowait',
}

export type CancelOptions = {
  mode: ECallKillMode | '',
} & WampDict;

export type InvocationDetails = {
  procedure?: string;
  receive_progress?: boolean;
  caller?: WampID;
  caller_authid?: string;
  caller_authrole?: string | string[];
  trustlevel?: number;
} & WampDict;

export type YieldOptions = {
  progress?: boolean;
} & WampDict;

export type InterruptOptions = {} & WampDict;

export type WampCallMessage = [EWampMessageID.CALL, WampID, CallOptions, WampURI, WampList?, WampDict?];
export type WampResultMessage = [EWampMessageID.RESULT, WampID, CallResultOptions, WampList?, WampDict?];
export type WampCancelMessage = [EWampMessageID.CANCEL, WampID, CancelOptions];

export type WampInvocationMessage = [EWampMessageID.INVOCATION, WampID, WampID, InvocationDetails, WampList?, WampDict?];
export type WampYieldMessage = [EWampMessageID.YIELD, WampID, YieldOptions, WampList?, WampDict?];
export type WampInterruptMessage = [EWampMessageID.INTERRUPT, WampID, InterruptOptions];
