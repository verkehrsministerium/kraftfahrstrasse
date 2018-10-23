import { ITransport, TransportEvent } from '../types/Transport';
import { ISerializer, IsBinarySerializer } from '../types/Serializer';
import { WampMessage } from '../types/Protocol';
import { Channel } from 'queueable';

export class WebSocketTransport implements ITransport {
  private webSocket: WebSocket | null;
  private channel = new Channel<TransportEvent>();
  constructor(private serializer: ISerializer, name: string) {
    console.log(name);
  }

  public async* Open(endpoint: string): AsyncIterableIterator<TransportEvent> {
    if (!!this.webSocket) {
      yield {
        type: "error",
        error: "Transport already opened!",
      };
      return;
    }

    this.webSocket = new WebSocket(endpoint, this.serializer.ProtocolID());
    if (IsBinarySerializer(this.serializer)) {
      this.webSocket.binaryType = "arraybuffer";
    }
    this.webSocket.onopen = () => {
      this.channel.push({
        type: "open",
      });
    }
    this.webSocket.onmessage = (ev) => {
      try {
        this.channel.push({
          type: "message",
          // FIXME: Report to TSC
          message: (this.serializer.Deserialize as any)(ev.data),
        });
      } catch (err) {
        this.channel.push({
          type: "error",
          error: err,
        });
      }
    }
    this.webSocket.onclose = (ev) => {
      this.webSocket.onclose = null;
      this.channel.push({
        code: ev.code,
        reason: ev.reason,
        type: "close",
        wasClean: ev.code === 1000,
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
      type: "close",
    });
  }

  public Send(msg: WampMessage): void {
    const payload = this.serializer.Serialize(msg);
    this.webSocket.send(payload);
  }
}
