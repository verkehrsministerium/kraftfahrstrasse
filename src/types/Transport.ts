import { WampMessage } from './Protocol';
import { ISerializer } from './Serializer';
import { WampDict } from './messages/MessageTypes';

export enum ETransportEventType {
  OPEN,
  ERROR,
  MESSAGE,
  CLOSE,
}

export type TransportEvent = {
  type: ETransportEventType.OPEN;
} | {
  type: ETransportEventType.ERROR;
  error: string;
} | {
  type: ETransportEventType.MESSAGE;
  message: WampMessage;
} | {
  type: ETransportEventType.CLOSE;
  code: number;
  reason: string;
  wasClean: boolean;
};

export interface ITransportFactory {
    new(serializer: ISerializer, options?: WampDict): ITransport;
}

export interface ITransport {
  Open(endpoint: string): AsyncIterableIterator<TransportEvent>;
  Close(code: number, reason: string): void;
  Send(message: WampMessage): void;
}
