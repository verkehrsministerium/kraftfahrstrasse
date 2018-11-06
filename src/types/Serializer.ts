import { WampMessage } from './Protocol';

export interface IBaseSerializer {
  ProtocolID(): string;
  IsBinary(): boolean;
}

export function IsBinarySerializer(ser: ISerializer): ser is IBinarySerializer {
  return ser.IsBinary();
}

export interface ITextSerializer extends IBaseSerializer {
  Serialize(msg: WampMessage): string;
  Deserialize(msg: string): WampMessage;
}

export interface IBinarySerializer extends IBaseSerializer {
  Serialize(msg: WampMessage): ArrayBufferLike;
  Deserialize(msg: ArrayBufferLike): WampMessage;
}

export type ISerializer = ITextSerializer | IBinarySerializer;
export { WampMessage };
