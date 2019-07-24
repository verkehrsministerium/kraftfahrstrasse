import { EWampMessageID } from '../types/messages/MessageTypes';
import { StateMachine, StateTransitionFunction } from './StateMachine';

export enum EConnectionState {
  CLOSED = 'CLOSED',
  ETABLISHING = 'ETABLISHING',
  ESTABLISHED = 'ETABLISHED',
  CLOSING = 'CLOSING',
  ERROR = 'ERROR',
  AUTHENTICATING = 'AUTHENTICATING',
  CHALLENGING = 'CHALLENGING',
}

export enum EMessageDirection {
  RECEIVED = 'RECEIVED',
  SENT = 'SENT',
}

export type TConnectionArgs = [EMessageDirection, EWampMessageID];

export class ConnectionStateMachine extends StateMachine<EConnectionState, [EMessageDirection, EWampMessageID]> {
  constructor() {
    const transitions = new Map<EConnectionState, StateTransitionFunction<EConnectionState, TConnectionArgs>>();
    transitions.set(EConnectionState.CLOSED, ([msgDir, msgId]) => {
      if (msgId === EWampMessageID.HELLO && msgDir === EMessageDirection.SENT) {
        return EConnectionState.ETABLISHING;
      }
      return EConnectionState.ERROR;
    });

    transitions.set(EConnectionState.ETABLISHING, ([msgDir, msgId]) => {
      if (msgId === EWampMessageID.WELCOME && msgDir === EMessageDirection.RECEIVED) {
        return EConnectionState.ESTABLISHED;
      } else if (msgId === EWampMessageID.CHALLENGE && msgDir === EMessageDirection.RECEIVED) {
          return EConnectionState.CHALLENGING;
      }
      return EConnectionState.ERROR;
    });

    transitions.set(EConnectionState.ESTABLISHED, ([, msgId]) => {
      if (msgId === EWampMessageID.GOODBYE) {
        return EConnectionState.CLOSING;
      }
      return null;
    });

    transitions.set(EConnectionState.CLOSING, ([, msgId]) => {
      if (msgId === EWampMessageID.GOODBYE) {
        return EConnectionState.CLOSED;
      }
      return EConnectionState.ERROR;
    });

    transitions.set(EConnectionState.CHALLENGING, ([msgDir, msgId]) => {
      if (msgId === EWampMessageID.AUTHENTICATE && msgDir === EMessageDirection.SENT) {
        return EConnectionState.AUTHENTICATING;
      }
      return EConnectionState.ERROR;
    });

    transitions.set(EConnectionState.AUTHENTICATING, ([msgDir, msgId]) => {
      if (msgId === EWampMessageID.WELCOME && msgDir === EMessageDirection.RECEIVED) {
        return EConnectionState.ESTABLISHED;
      }
      return EConnectionState.ERROR;
    });

    super(EConnectionState.CLOSED, transitions);
  }
}
