import {
  SubscribeOptions,
  WampSubscribeMessage,
  WampSubscribedMessage,
  WampUnsubscribeMessage,
  WampUnsubscribedMessage,
  WampEventMessage,
} from '../types/messages/SubscribeMessage';
import { WampID, WampURI, WampList, WampDict, EWampMessageID } from '../types/messages/MessageTypes';
import { WampErrorMessage, WampMessage } from '../types/Protocol';
import { ISubscription, EventHandler } from '../types/Connection';
import { MessageSender, IMessageProcessor, ProtocolViolator, IDGen } from './MessageProcessor';

import { Deferred } from 'queueable';

export class Subscription implements ISubscription {
  private handlers: EventHandler<WampList, WampDict>[] = [];

  public Unsubscribe(): Promise<void> {
    throw new Error("Unsubscribe failed");
  }
  public OnUnsubscribe(): Promise<void> {
    throw new Error("not implemented yet")
  }
  public ID(): number {
    return -1;
  }
}

export class Subscriber implements IMessageProcessor {
  private closed = false;
  private pendingSubscriptions = new Map<number, [Deferred<Subscription>, EventHandler<WampList, WampDict>]>();
  private currentSubscriptions = new Map<number, Subscription>();

  constructor(private sender: MessageSender, private violator: ProtocolViolator, private idGen: IDGen) {}

  public async Subscribe<A extends WampList, K extends WampDict>(topic: WampURI, handler: EventHandler<A, K>, options?: SubscribeOptions): Promise<ISubscription> {
    if (this.closed) {
      throw new Error("Subscriber already closed");
    }
    options = options || {};
    const requestID = this.idGen.session.ID();

    const msg: WampSubscribeMessage = [
      EWampMessageID.SUBSCRIBE,
      requestID,
      options,
      topic,
    ];
    this.sender(msg);
    const pendingSubscription = new Deferred<Subscription>();
    this.pendingSubscriptions.set(requestID, [pendingSubscription, handler]);
    return pendingSubscription.promise;
  }

  public Close(): void {
    this.closed = true;
  }

  public ProcessMessage(msg: WampMessage): boolean {
    if (this.closed) {
      return false;
    }
    if (msg[0] === EWampMessageID.SUBSCRIBED) {
      const requestID = msg[1];
      const [subPromise, handler] = this.pendingSubscriptions.get(requestID) || [null, null];
      if (!subPromise) {
        this.violator("unexpected SUBSCRIBED");
        return true;
      }
      const subscriptionID = msg[2];
      const subscription = this.currentSubscriptions.get(subscriptionID) || new Subscription();
    }
    return false;
  }
}
