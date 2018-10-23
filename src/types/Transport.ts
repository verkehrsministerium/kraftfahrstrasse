import { WampMessage } from './Protocol';
import { ISerializer } from './Serializer';

export type TransportEvent = {
  type: 'open';
} | {
  type: 'error';
  error: string;
} | {
  type: 'message';
  message: WampMessage;
} | {
  type: 'close';
  code: number;
  reason: string;
  wasClean: boolean;
};

export interface ITransportFactory {
    new(serializer: ISerializer, name: string): ITransport;
}

export interface ITransport {
  Open(endpoint: string): AsyncIterableIterator<TransportEvent>;
  Close(code: number, reason: string): void;
  Send(message: WampMessage): void;
}
