import * as WebSocket from 'ws';

import { WampDict } from '../types/messages/MessageTypes';
import { ISerializer } from '../types/Serializer';
import { WebSocketTransport } from './WebSocketTransport';

export class NodeWebSocketTransport extends WebSocketTransport {
  constructor(serializer: ISerializer, _?: WampDict) {
    super(serializer, WebSocket as any);
  }
}
