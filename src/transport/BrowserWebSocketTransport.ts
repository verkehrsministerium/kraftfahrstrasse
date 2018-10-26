import { ITransport, TransportEvent, ETransportEventType } from '../types/Transport';
import { ISerializer, IsBinarySerializer } from '../types/Serializer';
import { WampMessage } from '../types/Protocol';
import { WampDict } from '../types/messages/MessageTypes';
import { Channel } from 'queueable';

export class BrowserWebSocketTransport implements ITransport {
  private webSocket: WebSocket | null;
  private channel = new Channel<TransportEvent>();
  constructor(private serializer: ISerializer, _: WampDict) {
  }

  public Open(endpoint: string): AsyncIterableIterator<TransportEvent> {
    console.log(`NodeWebSocketTransport open: ${endpoint}`);
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
      console.log(`WS onopen`)
      this.channel.push({
        type: ETransportEventType.OPEN,
      });
    }
    this.webSocket.onmessage = (ev) => {
      console.log(`WS onmessage: ${ev.data}`);
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
    }
    this.webSocket.onclose = (ev) => {
      console.log(`WS onclose: ${ev.code} ${ev.reason} ${ev.wasClean}`);
      this.webSocket.onclose = null;
      this.channel.push({
        code: ev.code,
        reason: ev.reason,
        type: ETransportEventType.CLOSE,
        wasClean: ev.wasClean,
      });
    }
    return this.channel;
  }

  public Close(code: number, reason: string): void {
    this.webSocket.onclose = null;
    this.webSocket.close(code, reason);
    this.channel.push({
      code: code,
      reason: reason,
      wasClean: true,
      type: ETransportEventType.CLOSE,
    });
  }

  public Send(msg: WampMessage): void {
    const payload = this.serializer.Serialize(msg);
    console.log(`Sending message: ${payload}`);
    this.webSocket.send(payload);
  }
}
