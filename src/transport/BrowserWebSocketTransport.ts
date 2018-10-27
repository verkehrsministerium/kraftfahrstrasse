import { WampDict } from '../types/messages/MessageTypes';
import { ISerializer } from '../types/Serializer';
import { WebSocketTransport } from './WebSocketTransport';

export class BrowserWebSocketTransport extends WebSocketTransport {
  constructor(serializer: ISerializer, _: WampDict) {
    super(serializer, WebSocket);
  }
}
