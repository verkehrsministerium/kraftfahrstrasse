import { EWampMessageID, WampDict, WampID, WampList, WampURI } from '../types/messages/MessageTypes';
import { WampErrorMessage } from '../types/Protocol';

class WampError<TArgs extends WampList = WampList, TKwArgs extends WampDict = WampDict> {
  constructor(public errorUri: WampURI, public args?: TArgs, public kwArgs?: TKwArgs) {

  }

  public toErrorMessage(callId: WampID): WampErrorMessage {
    return [
      EWampMessageID.ERROR,
      EWampMessageID.INVOCATION,
      callId,
      {},
      this.errorUri,
      this.args || [],
      this.kwArgs || {},
    ];
  }

}

export {
  WampError,
};
