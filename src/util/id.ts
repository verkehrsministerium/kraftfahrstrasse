import { WampID } from '../types/messages/MessageTypes';

export const GlobalID = (): WampID => {
  // Taken from autobahn-js util.js
  return Math.floor(Math.random() * 9007199254740992) + 1;
}
