import {EWampMessageID, WampMessage, WampWelcomeMessage} from "../types/Protocol";

enum ConnectionStates {
    CLOSED = "CLOSED",
    ETABLISHING = "ETABLISHING",
    ETABLISHED = "ETABLISHED",
    SHUTTINGDOWN = "SHUTTINGDOWN",
    CLOSING = "CLOSING",
    ERROR = "Error",
    AUTHENTICATE = "AUTHENTICATE",
    CHALLENGING = "CHALLENGING",
}

enum MessageDirection {
    RECEIVED = "RECEIVED",
    SENT = "SENT",
}

const transitionFunction = (currentState: ConnectionStates, args: [MessageDirection, EWampMessageID, WampMessage]): ConnectionStates => {

    const [messageDirection, messageId, wampMessage] = args;

    switch (currentState) {
        case ConnectionStates.CLOSED: {

            if (messageId === EWampMessageID.HELLO && messageDirection === MessageDirection.SENT) {
                return ConnectionStates.ETABLISHING;
            }

            break;
        }
        case ConnectionStates.ETABLISHING: {

            if (messageId === EWampMessageID.WELCOME && messageDirection === MessageDirection.RECEIVED) {
                return ConnectionStates.ETABLISHED;
            } else if (messageId === EWampMessageID.CHALLENGE && messageDirection === MessageDirection.RECEIVED) {
                return ConnectionStates.CHALLENGING;
            }

            break;
        }
        case ConnectionStates.ETABLISHED: {
            break;
        }
        case ConnectionStates.SHUTTINGDOWN: {
            break;
        }
        case ConnectionStates.CLOSING: {
            break;
        }
        case ConnectionStates.CHALLENGING: {

            if (messageId === EWampMessageID.WELCOME && messageDirection === MessageDirection.RECEIVED) {
                return ConnectionStates.ETABLISHED;
            }
            break;
        }
    }

    return currentState;
};

class ConnectionStateMachine extends StateMachine<ConnectionStates, [MessageDirection, EWampMessageID]> {
    constructor() {
        super(ConnectionStates.CLOSED, transitionFunction);
    }

}
