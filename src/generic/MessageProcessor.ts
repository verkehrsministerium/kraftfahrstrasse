import { WampMessage } from '../types/Protocol';
import { IIDGenerator } from '../util/id';

export type MessageSender = (msg: WampMessage) => void;
export type ProtocolViolator = (msg: string) => void;
export type IDGen = {
  global: IIDGenerator;
  session: IIDGenerator;
};

export interface IMessageProcessorFactory {
  new (sender: MessageSender, violator: ProtocolViolator, idgen: IDGen): IMessageProcessor;
}
export interface IMessageProcessor {
  Close(): void;
  ProcessMessage(msg: WampMessage): boolean;
}
