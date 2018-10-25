import {
  SubscribeOptions,
  WampSubscribeMessage,
  WampUnsubscribeMessage,
  EventDetails,
} from '../types/messages/SubscribeMessage';
import { WampID, WampURI, WampList, WampDict, EWampMessageID } from '../types/messages/MessageTypes';
import { WampMessage } from '../types/Protocol';
import { ISubscription, EventHandler } from '../types/Connection';
import { MessageSender, IMessageProcessor, ProtocolViolator, IDGen } from './MessageProcessor';

import { Deferred } from 'queueable';

class MultiSubscription {
  private handlers = new Map<WampID, Subscription>();
  public onUnsubscribed = new Deferred<void>();
  private unsubscribed = false;
  constructor(public subscriptionID: WampID, private unsubscribe: (sub: MultiSubscription) => void) {
    this.onUnsubscribed.promise.then(() => {
      this.unsubscribed = true;
      for (const sub of this.handlers) {
        sub[1].onUnsubscribed.resolve();
      }
      this.handlers.clear();
    }, err => {
      this.unsubscribed = true;
      for (const sub of this.handlers) {
        sub[1].onUnsubscribed.reject(err);
      }
      this.handlers.clear();
    });
  }

  public addSubscription(requestID: WampID, sub: Subscription): void {
    if (this.unsubscribed) {
      throw new Error("Subscription is already destroyed");
    }
    this.handlers.set(requestID, sub);
  }

  public async Unsubscribe(requestID: WampID): Promise<void> {
    const sub = this.handlers.get(requestID);
    if (!sub) {
      throw new Error("no such subscription");
    }
    this.handlers.delete(requestID);
    if (this.handlers.size === 0) {
      this.onUnsubscribed.promise.then(() => {
        sub.onUnsubscribed.resolve();
      }, err => {
        sub.onUnsubscribed.reject(err);
      });
      this.unsubscribe(this);
    } else {
      sub.onUnsubscribed.resolve();
    }
    return sub.onUnsubscribed.promise;
  }

  public trigger(args: WampList, kwArgs: WampDict, details: EventDetails): void {
    if (this.unsubscribed) {
      return;
    }
    for (const subid of this.handlers) {
      // TODO: Exception handling
      subid[1].handler(args, kwArgs, details);
    }
  }
}

class Subscription implements ISubscription {
  public onUnsubscribed = new Deferred<void>();

  constructor(
    public handler: EventHandler<WampList, WampDict>,
    private requestID: WampID,
    private parent: MultiSubscription
  ) {
    this.parent.addSubscription(requestID, this);
  }

  public Unsubscribe(): Promise<void> {
    return this.parent.Unsubscribe(this.requestID);
  }
  public OnUnsubscribed(): Promise<void> {
    return this.onUnsubscribed.promise;
  }
  public ID(): WampID {
    return this.parent.subscriptionID;
  }
}

export class Subscriber implements IMessageProcessor {
  public static GetFeatures(): WampDict {
    return {
      subscriber: {
        features: {
          publisher_identification: true,
          publication_trustlevels: true,
          pattern_based_subscription: true,
          sharded_subscription: true,
          event_history: true,
        }
      }
    }
  }

  private closed = false;
  private pendingSubscriptions = new Map<WampID, [Deferred<Subscription>, EventHandler<WampList, WampDict>]>();
  private pendingUnsubscriptions = new Map<WampID, MultiSubscription>();
  private currentSubscriptions = new Map<WampID, MultiSubscription>();

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
      options || {},
      topic,
    ];
    this.sender(msg);
    const pendingSubscription = new Deferred<Subscription>();
    this.pendingSubscriptions.set(requestID, [pendingSubscription, handler]);
    return pendingSubscription.promise;
  }

  public Close(): void {
    this.closed = true;
    for (const pendingSub of this.pendingSubscriptions) {
      pendingSub[1][0].reject("subscriber closing");
    }
    this.pendingSubscriptions.clear();
    for (const pendingUnsub of this.pendingUnsubscriptions) {
      pendingUnsub[1].onUnsubscribed.reject("subscriber closing");
      this.currentSubscriptions.delete(pendingUnsub[1].subscriptionID);
    }
    this.pendingUnsubscriptions.clear();
    for (const currentSub of this.currentSubscriptions) {
      currentSub[1].onUnsubscribed.reject("subscriber closing");
    }
    this.currentSubscriptions.clear();

  }

  public ProcessMessage(msg: WampMessage): boolean {
    if (this.closed) {
      return false;
    }
    if (msg[0] === EWampMessageID.SUBSCRIBED) {
      const requestID = msg[1];
      const [subPromise, handler] = this.pendingSubscriptions.get(requestID) || [null, null];
      if (subPromise === null) {
        this.violator("unexpected SUBSCRIBED");
        return true;
      }
      const subId = msg[2];
      let subscriptionWrapper = this.currentSubscriptions.get(subId);
      if (!subscriptionWrapper) {
        subscriptionWrapper = new MultiSubscription(subId, (sub) => this.sendUnsubscribe(sub));
        this.currentSubscriptions.set(subId, subscriptionWrapper);
      }
      const subscription = new Subscription(handler, requestID, subscriptionWrapper);
      subPromise.resolve(subscription);
      this.pendingSubscriptions.delete(requestID);
      return true;
    }
    if (msg[0] === EWampMessageID.ERROR && msg[1] == EWampMessageID.SUBSCRIBE) {
      const requestID = msg[2];
      const [subPromise] = this.pendingSubscriptions.get(requestID) || [null, null];
      if (subPromise === null) {
        this.violator("unexpected SUBSCRIBE ERROR");
        return true;
      }
      subPromise.reject(msg[4]);
      this.pendingSubscriptions.delete(requestID);
      return true;
    }
    if (msg[0] === EWampMessageID.EVENT) {
      const subId = msg[1];
      const subscription = this.currentSubscriptions.get(subId);
      if (!subscription) {
        this.violator("unexpected EVENT")
        return true;
      }

      const details = msg[3];
      details.publicationId = msg[2];
      subscription.trigger(msg[4], msg[5], details);
      return true;
    }
    if (msg[0] === EWampMessageID.UNSUBSCRIBED) {
      const requestID = msg[1];
      if (requestID === 0) {
        // a requestID of zero means, that the subscription was revoked by the router
        const details = msg[2];
        const sub = this.currentSubscriptions.get(details.subscription);
        if (!sub) {
          this.violator("unexpected router UNSUBSCRIBED");
          return true;
        }
        sub.onUnsubscribed.resolve()
        this.currentSubscriptions.delete(details.subscription);
      } else {
        // requestID was actively set by the router
        const sub = this.pendingUnsubscriptions.get(requestID);
        if (!sub) {
          // if the requestID couldn't be found, it's a protocol violation
          this.violator("unexpected UNSUBSCRIBED");
          return true;
        }
        sub.onUnsubscribed.resolve();
        this.currentSubscriptions.delete(sub.subscriptionID);
      }
      return true;
    }
    if (msg[0] === EWampMessageID.ERROR && msg[1] === EWampMessageID.UNSUBSCRIBE) {
      const requestID = msg[2];
      const sub = this.pendingUnsubscriptions.get(requestID);
      if (!sub) {
        this.violator("unexpected UNSUBSCRIBE ERROR");
        return true;
      }
      this.pendingUnsubscriptions.delete(requestID);
      sub.onUnsubscribed.reject(msg[4]);
      return true;
    }
    return false;
  }

  private sendUnsubscribe(sub: MultiSubscription): void {
    const requestID = this.idGen.session.ID();
    const msg: WampUnsubscribeMessage = [
      EWampMessageID.UNSUBSCRIBE,
      requestID,
      sub.subscriptionID,
    ];
    this.pendingUnsubscriptions.set(requestID, sub);
    this.sender(msg);
  }
}
