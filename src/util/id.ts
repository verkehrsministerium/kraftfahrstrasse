import { WampID } from '../types/messages/MessageTypes';

export interface IIDGenerator {
  ID(): WampID;
}

export class GlobalIDGenerator implements IIDGenerator {
  public ID(): WampID {
    // Taken from autobahn-js util.js
    return Math.floor(Math.random() * 9007199254740992) + 1;
  }
}

export class SessionIDGenerator implements IIDGenerator {
  private currentID = 1;
  public ID(): WampID {
    return this.currentID++;
  }
}
