import { Channel } from 'queueable';

import { WampDict } from '..';
import { WampMessage } from '../types/Protocol';
import { IsBinarySerializer, ISerializer } from '../types/Serializer';
import { ETransportEventType, ITransport, TransportEvent } from '../types/Transport';

export interface IWebSocketFactory {
  new(endpoint: string, protocol?: string | string[], transportOptions?: WampDict): WebSocket;
}

export abstract class WebSocketTransport implements ITransport {
  protected webSocket: WebSocket | null = null;
  private channel = new Channel<TransportEvent>();

  constructor(
    private serializer: ISerializer,
    private webSocketFactory: IWebSocketFactory,
    private transportOptions?: WampDict) {
  }

  public Open(endpoint: string): AsyncIterableIterator<TransportEvent> {
    if (!!this.webSocket) {
      const channel = new Channel<TransportEvent>();
      channel.push({
        type: ETransportEventType.ERROR,

        error: 'Transport already opened!',
      });
      return channel;
    }

    this.webSocket = new this.webSocketFactory(endpoint, this.serializer.ProtocolID(), this.transportOptions);
    if (IsBinarySerializer(this.serializer)) {
      this.webSocket.binaryType = 'arraybuffer';
    }
    this.webSocket.onopen = () => {
      this.channel.push({
        type: ETransportEventType.OPEN,
      });
    };
    this.webSocket.onmessage = ev => {

      try {
        const msg = (this.serializer.Deserialize as any)(ev.data);
        // console.log("<=== RECEIVE MESSAGE:", msg);
        this.channel.push({
          type: ETransportEventType.MESSAGE,
          // FIXME: Report to TSC
          message: msg,
        });
      } catch (err) {
        this.channel.push({
          type: ETransportEventType.ERROR,

          error: err,
        });
      }
    };
    this.webSocket.onclose = ev => {
      this.webSocket!.onclose = null;
      this.channel.push({
        type: ETransportEventType.CLOSE,

        code: ev.code,
        reason: ev.reason,
        wasClean: ev.wasClean,
      });
    };
    return this.channel;
  }

  public Close(code: number, reason: string): void {
    if (!this.webSocket) {
      return;
    }
    this.webSocket.onclose = null;
    this.webSocket.close(code, reason);
    this.channel.push({
      type: ETransportEventType.CLOSE,

      code,
      reason,
      wasClean: true,
    });
  }

  public Send(msg: WampMessage): void {
    // console.log("===> SENDING MESSAGE:", msg);
    const payload = this.serializer.Serialize(msg);
    this.webSocket!.send(payload);
  }
}
