import { EWampMessageID, WampURI, WampID, WampDict, WampList } from './messages/MessageTypes';
import { WampHelloMessage } from './messages/HelloMessage';
import { WampWelcomeMessage } from './messages/WelcomeMessage';

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
  WampErrorMessage;

export type CallOptions = {
  receive_progress: boolean;
}
