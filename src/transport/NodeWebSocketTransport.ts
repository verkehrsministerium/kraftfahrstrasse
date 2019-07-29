import { Deferred } from 'queueable';
import * as WebSocket from 'ws';

import { WampDict } from '../types/messages/MessageTypes';
import { ISerializer } from '../types/Serializer';
import { WebSocketTransport } from './WebSocketTransport';

export class NodeWebSocketTransport extends WebSocketTransport {

  constructor(serializer: ISerializer, transportOptions ?: WampDict) {
    super('NodeWebSocketTransport', serializer, WebSocket as any, transportOptions);
  }

  protected async sendInternal(payload: string | ArrayBuffer): Promise<void> {
    const d = new Deferred<void>();
    (this.webSocket as WebSocket).send(payload, (err?: Error) => {
      if (err) {
        d.reject(err);
      }
      d.resolve();
    });
    return d.promise;
  }
}
