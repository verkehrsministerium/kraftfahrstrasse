import { WampDict } from '../types/messages/MessageTypes';
import { WampMessage } from '../types/Protocol';

import { Logger } from '../logging/Logger';
import { IIDGenerator } from '../util/id';

export type MessageSender = (msg: WampMessage) => Promise<void>;
export type ProtocolViolator = (msg: string) => void;
export type IDGen = {
  global: IIDGenerator;
  session: IIDGenerator;
};

export interface IMessageProcessorFactory {
  new (sender: MessageSender, violator: ProtocolViolator, idGen: IDGen, logger: Logger): IMessageProcessor;
  GetFeatures(): WampDict;
}
export interface IMessageProcessor {
  Close(): void;
  ProcessMessage(msg: WampMessage): Promise<boolean>;
}

export abstract class MessageProcessor {
  protected closed = false;
  constructor(
    protected sender: MessageSender,
    protected violator: ProtocolViolator,
    protected idGen: IDGen,
    protected logger: Logger,
  ) {}

  public Close(): void {
    this.closed = true;
    this.onClose();
  }

  public ProcessMessage(msg: WampMessage): Promise<boolean> {
    if (this.closed) {
      return Promise.resolve(false);
    }
    return this.onMessage(msg);
  }

  protected abstract onClose(): void;
  protected async abstract onMessage(msg: WampMessage): Promise<boolean>;
}
