// We have to use a different MsgPackSerializer for the browser, because msgpack5 depends on
// bl which uses some node globals if not correctly bundled.
// However, this will stop bundling from working correctly, as msgpack is always pulled in.
// So we don't export the msgpack serializer by default, but instead rely on ES6 modules.

import * as msgpackFactory from 'msgpack5/dist/msgpack5';

import { WampMessage } from '../types/Protocol';
import { IBinarySerializer } from '../types/Serializer';

export class BrowserMSGPackSerializer implements IBinarySerializer {
  private msgpack: any;
  constructor() {
    this.msgpack = msgpackFactory({
      forceFloat64: true,
    });
    this.msgpack.register(42, ArrayBuffer, (buf: ArrayBufferLike) => buf, (buf: ArrayBufferLike) => buf);
  }
  public IsBinary(): boolean {
    return true;
  }
  public ProtocolID(): string {
    return 'wamp.2.msgpack';
  }
  public Serialize(msg: WampMessage): ArrayBufferLike {
    return this.msgpack.encode(msg) as any;
  }
  public Deserialize(msg: ArrayBufferLike): WampMessage {
    return this.msgpack.decode(msg as any);
  }
}
