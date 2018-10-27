import { WampDict } from '../types/messages/MessageTypes';
import { WampMessage } from '../types/Protocol';

import { IIDGenerator } from '../util/id';

export type MessageSender = (msg: WampMessage) => void;
export type ProtocolViolator = (msg: string) => void;
export type IDGen = {
  global: IIDGenerator;
  session: IIDGenerator;
};

export interface IMessageProcessorFactory {
  new (sender: MessageSender, violator: ProtocolViolator, idGen: IDGen): IMessageProcessor;
  GetFeatures(): WampDict;
}
export interface IMessageProcessor {
  Close(): void;
  ProcessMessage(msg: WampMessage): boolean;
}

export abstract class MessageProcessor {
  protected closed = false;
  constructor(
    protected sender: MessageSender,
    protected violator: ProtocolViolator,
    protected idGen: IDGen,
  ) {}

  public Close(): void {
    this.closed = true;
    this.onClose();
  }

  public ProcessMessage(msg: WampMessage): boolean {
    if (this.closed) {
      return false;
    }
    return this.onMessage(msg);
  }

  protected abstract onClose(): void;
  protected abstract onMessage(msg: WampMessage): boolean;
}
