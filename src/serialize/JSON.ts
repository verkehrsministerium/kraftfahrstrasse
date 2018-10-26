import { ITextSerializer } from '../types/Serializer';
import { WampMessage } from '../types/Protocol';

export class JSONSerializer implements ITextSerializer {
  public IsBinary(): boolean {
    return false;
  }

  public ProtocolID(): string {
    return 'wamp.2.json';
  }

  public Serialize(msg: WampMessage): string {
    return JSON.stringify(msg);
  }

  public Deserialize(msg: string): WampMessage {
    return JSON.parse(msg);
  }
}
