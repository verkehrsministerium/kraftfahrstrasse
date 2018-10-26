import { EWampMessageID, WampDict, WampID, WampList, WampURI } from './messages/MessageTypes';

import { WampHelloMessage } from './messages/HelloMessage';
import { WampWelcomeMessage } from './messages/WelcomeMessage';

import {
  WampCallMessage,
  WampCancelMessage,
  WampInterruptMessage,
  WampInvocationMessage,
  WampResultMessage,
  WampYieldMessage,
} from './messages/CallMessage';

import {
  WampPublishedMessage,
  WampPublishMessage,
} from './messages/PublishMessage';

import {
  WampEventMessage,
  WampSubscribedMessage,
  WampSubscribeMessage,
  WampUnsubscribedMessage,
  WampUnsubscribeMessage,
} from './messages/SubscribeMessage';

import {
  WampRegisteredMessage,
  WampRegisterMessage,
  WampUnregisteredMessage,
  WampUnregisterMessage,
} from './messages/RegisterMessage';

export type WampAbortMessage = [EWampMessageID.ABORT, WampDict, WampURI];
export type WampGoodbyeMessage = [EWampMessageID.GOODBYE, WampDict, WampURI];
export type WampChallengeMessage = [EWampMessageID.CHALLENGE, string, WampDict?];
export type WampAuthenticateMessage = [EWampMessageID.AUTHENTICATE, string, WampDict?];
export type WampErrorMessage = [EWampMessageID.ERROR, EWampMessageID, WampID, WampDict, WampURI, WampList?, WampDict?];

export type WampMessage =
  WampHelloMessage |
  WampWelcomeMessage |
  WampAbortMessage |
  WampGoodbyeMessage |
  WampAuthenticateMessage |
  WampChallengeMessage |
  WampPublishMessage |
  WampPublishedMessage |
  WampSubscribeMessage |
  WampSubscribedMessage |
  WampUnsubscribeMessage |
  WampUnsubscribedMessage |
  WampEventMessage |
  WampCallMessage |
  WampResultMessage |
  WampCancelMessage |
  WampRegisterMessage |
  WampUnregisterMessage |
  WampRegisteredMessage |
  WampUnregisteredMessage |
  WampInvocationMessage |
  WampYieldMessage |
  WampInterruptMessage |
  WampErrorMessage;
