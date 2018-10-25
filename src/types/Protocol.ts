import { EWampMessageID, WampURI, WampID, WampDict, WampList } from './messages/MessageTypes';
import { WampHelloMessage } from './messages/HelloMessage';
import { WampWelcomeMessage } from './messages/WelcomeMessage';
import { WampPublishMessage, WampPublishedMessage } from './messages/PublishMessage';
import {
  WampEventMessage,
  WampSubscribeMessage,
  WampSubscribedMessage,
  WampUnsubscribeMessage,
  WampUnsubscribedMessage,
} from './messages/SubscribeMessage';
import {
  WampCallMessage,
  WampResultMessage,
  WampCancelMessage,
} from './messages/CallMessage';

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
  WampErrorMessage;
