import * as NodeWS from 'ws';

import { WampDict } from '../types/messages/MessageTypes';
import { WampMessage } from '../types/Protocol';
import { IsBinarySerializer, ISerializer } from '../types/Serializer';
import { ETransportEventType, ITransport, TransportEvent } from '../types/Transport';
import { SerializationError } from './SerializationError';

export interface IWebSocketFactory {
  new(endpoint: string, protocol?: string | string[], transportOptions?: WampDict): WebSocket;
}

export abstract class WebSocketTransport implements ITransport {
  protected webSocket: WebSocket | NodeWS | null = null;
  private callback: ((ev: TransportEvent) => void) | null = null;

  constructor(
    public name: string,
    private serializer: ISerializer,
    private webSocketFactory: IWebSocketFactory,
    private transportOptions?: WampDict,
  ) {
  }

  public Open(endpoint: string, cb: (ev: TransportEvent) => void) {
    if (!!this.webSocket) {
      cb({
        type: ETransportEventType.ERROR,
        error: 'Transport already opened!',
      });
      return;
    }

    this.webSocket = new this.webSocketFactory(endpoint, this.serializer.ProtocolID(), this.transportOptions);
    this.callback = cb;

    if (IsBinarySerializer(this.serializer)) {
      this.webSocket.binaryType = 'arraybuffer';
    }
    this.webSocket.onopen = () => {
      cb({
        type: ETransportEventType.OPEN,
      });
    };

    this.webSocket.onmessage = ev => {
      try {
        const msg = (this.serializer.Deserialize as any)(ev.data);
        cb({
          type: ETransportEventType.MESSAGE,
          message: msg,
        });
      } catch (err) {
        cb({
          type: ETransportEventType.ERROR,
          error: err,
        });
      }
    };
    this.webSocket.onclose = ev => {
      this.webSocket!.onclose = null;
      this.webSocket!.onerror = null;
      this.callback = null;
      this.webSocket = null;
      cb({
        type: ETransportEventType.CLOSE,
        code: ev.code,
        reason: ev.reason,
        wasClean: ev.wasClean,
      });
    };
    this.webSocket.onerror = (err: any) => {
      this.webSocket!.onclose = null;
      this.webSocket!.onerror = null;
      this.callback = null;
      this.webSocket = null;
      cb({
        type: ETransportEventType.ERROR,
        error: `Transport error: ${err.error}`,
      });
    };
  }

  public Close(code: number, reason: string): void {
    if (!this.webSocket || !this.callback) {
      return;
    }
    this.webSocket.onclose = null;
    this.webSocket.onerror = null;
    this.webSocket.close(code, reason);
    this.callback({
      type: ETransportEventType.CLOSE,

      code,
      reason,
      wasClean: true,
    });
    this.callback = null;
    this.webSocket = null;
  }

  public Send(msg: WampMessage): Promise<void> {
    // console.log("===> SENDING MESSAGE:", msg);
    let payload;
    try {
      payload = this.serializer.Serialize(msg);
    } catch (err) {
      throw new SerializationError(err);
    }
    return this.sendInternal(payload);
  }

  protected abstract sendInternal(payload: string | ArrayBuffer): Promise<void>;
}
