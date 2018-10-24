import { EWampMessageID } from '../types/messages/MessageTypes';
import { StateMachine } from './StateMachine';

export enum EConnectionState {
  CLOSED = "CLOSED",
  ETABLISHING = "ETABLISHING",
  ESTABLISHED = "ETABLISHED",
  CLOSING = "CLOSING",
  ERROR = "ERROR",
  AUTHENTICATING = "AUTHENTICATING",
  CHALLENGING = "CHALLENGING",
}

export enum EMessageDirection {
  RECEIVED = "RECEIVED",
  SENT = "SENT",
}

const transitionFunction = (currentState: EConnectionState, args: [EMessageDirection, EWampMessageID]): EConnectionState => {
  console.log(`Update State:`, currentState, args[0], args[1]);
  const [messageDirection, messageId] = args;
  switch (currentState) {
      case EConnectionState.CLOSED: {
          if (messageId === EWampMessageID.HELLO && messageDirection === EMessageDirection.SENT) {
              return EConnectionState.ETABLISHING;
          } else {
            return EConnectionState.ERROR;
          }
      }
      case EConnectionState.ETABLISHING: {
          if (messageId === EWampMessageID.WELCOME && messageDirection === EMessageDirection.RECEIVED) {
              return EConnectionState.ESTABLISHED;
          } else if (messageId === EWampMessageID.CHALLENGE && messageDirection === EMessageDirection.RECEIVED) {
              return EConnectionState.CHALLENGING;
          } else {
            return EConnectionState.ERROR;
          }
      }
      case EConnectionState.ESTABLISHED: {
          if (messageId === EWampMessageID.GOODBYE) {
            return EConnectionState.CLOSING;
          }
          return currentState;
      }
      case EConnectionState.CLOSING: {
          if (messageId === EWampMessageID.GOODBYE) {
            return EConnectionState.CLOSED;
          } else {
            return EConnectionState.ERROR;
          }
      }
      case EConnectionState.CHALLENGING: {
          if (messageId === EWampMessageID.AUTHENTICATE && messageDirection === EMessageDirection.SENT) {
            return EConnectionState.AUTHENTICATING;
          } else {
            return EConnectionState.ERROR;
          }
      }
      case EConnectionState.AUTHENTICATING: {
        if (messageId === EWampMessageID.WELCOME && messageDirection === EMessageDirection.RECEIVED) {
          return EConnectionState.ESTABLISHED;
        } else {
          return EConnectionState.ERROR;
        }
      }
  }

  return currentState;
};

export class ConnectionStateMachine extends StateMachine<EConnectionState, [EMessageDirection, EWampMessageID]> {
  constructor() {
    super(EConnectionState.CLOSED, transitionFunction);
  }
}
