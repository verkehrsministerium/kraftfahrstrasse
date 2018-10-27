import * as WebSocket from 'ws';

import { ISerializer } from '../types/Serializer';
import { WebSocketTransport } from './WebSocketTransport';
import { WampDict } from '../types/messages/MessageTypes';

export class NodeWebSocketTransport extends WebSocketTransport {
  constructor(serializer: ISerializer, _: WampDict) {
    super(serializer, WebSocket as any);
  }
}
