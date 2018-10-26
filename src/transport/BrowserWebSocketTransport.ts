import { Channel } from 'queueable';

import { WampDict } from '../types/messages/MessageTypes';

import { WampMessage } from '../types/Protocol';
import { IsBinarySerializer, ISerializer } from '../types/Serializer';
import { ETransportEventType, ITransport, TransportEvent } from '../types/Transport';

export class BrowserWebSocketTransport implements ITransport {
  private webSocket: WebSocket | null;
  private channel = new Channel<TransportEvent>();
  constructor(private serializer: ISerializer, _: WampDict) {
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

    this.webSocket = new WebSocket(endpoint, this.serializer.ProtocolID());
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
        this.channel.push({
          type: ETransportEventType.MESSAGE,

          // FIXME: Report to TSC
          message: (this.serializer.Deserialize as any)(ev.data),
        });
      } catch (err) {
        this.channel.push({
          type: ETransportEventType.ERROR,

          error: err,
        });
      }
    };
    this.webSocket.onclose = ev => {
      this.webSocket.onclose = null;
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
    const payload = this.serializer.Serialize(msg);
    this.webSocket.send(payload);
  }
}
