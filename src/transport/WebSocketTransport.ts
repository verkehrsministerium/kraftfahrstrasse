import { Channel } from 'queueable';

import { WampDict } from '../types/messages/MessageTypes';
import { WampMessage } from '../types/Protocol';
import { IsBinarySerializer, ISerializer } from '../types/Serializer';
import { ETransportEventType, ITransport, TransportEvent } from '../types/Transport';

import * as WebSocketStream from 'websocket-stream';
import { WebSocketDuplex } from 'websocket-stream';

import { Writable } from 'stream';

export interface IWebSocketFactory {
  new(endpoint: string, protocol?: string | string[], transportOptions?: WampDict): WebSocket;
}

export abstract class WebSocketTransport implements ITransport {
  protected webSocket: WebSocketDuplex | null = null;
  private channel = new Channel<TransportEvent>();

  constructor(
    public name: string,
    private serializer: ISerializer,
    private webSocketFactory: IWebSocketFactory,
    private transportOptions?: WampDict,
  ) {
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

    this.webSocket = WebSocketStream(endpoint, this.serializer.ProtocolID(), this.transportOptions);
    if (IsBinarySerializer(this.serializer)) {
      this.webSocket.socket.binaryType = 'arraybuffer';
    }
    this.webSocket!.socket.onopen = () => {
      this.channel.push({
        type: ETransportEventType.OPEN,
      });
    };

    const that = this;

    class DeserializeStream extends Writable {
      public _write(chunk: string | Buffer | Uint8Array | any, enc: string, next: () => void): void {
        console.log(chunk.toString());
        try {
          const msg = (that.serializer.Deserialize as any)(chunk.toString());
          that.channel.push({
            type: ETransportEventType.MESSAGE,
            message: msg,
          });
        } catch (err) {
          that.channel.push({
            type: ETransportEventType.ERROR,
            error: err,
          });
        }
        next();
      }
    }
    //this.webSocket.pipe(new DeserializeStream());

    this.webSocket!.socket.onclose = ev => {
      this.webSocket!.socket.onclose = null as any;
      this.webSocket!.socket.onerror = null as any;
      this.channel.push({
        type: ETransportEventType.CLOSE,
        code: ev.code,
        reason: ev.reason,
        wasClean: ev.wasClean,
      });
    };
    this.webSocket!.socket.onerror = err => {
      this.webSocket!.socket.onclose = null as any;
      this.webSocket!.socket.onerror = null as any;
      this.channel.push({
        type: ETransportEventType.ERROR,
        error: `Transport error: ${err}`,
      });
    };
    return this.channel;
  }

  public Close(code: number, reason: string): void {
    if (!this.webSocket) {
      return;
    }
    this.webSocket.socket.onclose = null as any;
    this.webSocket.socket.close(code, reason);
    this.channel.push({
      type: ETransportEventType.CLOSE,

      code,
      reason,
      wasClean: true,
    });
  }

  public async Send(msg: WampMessage): Promise<void> {
    // console.log("===> SENDING MESSAGE:", msg);

    //this.webSocket!.cork();
    //process.nextTick(() => this.webSocket!.uncork());

    const payload = this.serializer.Serialize(msg);
    await new Promise(resolve => {
      console.log("wriiiiiiiiiting");
      // FIXME: Using this.webSocket!.write here causes a deadlock during Open()
      //        The data is buffered here and Open() waits for a Welcome message to resolve
      this.webSocket!.socket.send(payload, resolve);
    });
    console.log("doooooooone");
  }
}
