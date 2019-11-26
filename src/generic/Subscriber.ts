
import { MessageProcessor } from './MessageProcessor';

import {
  EventDetails,
  SubscribeOptions,
  WampSubscribedMessage,
  WampSubscribeMessage,
  WampUnsubscribedMessage,
  WampUnsubscribeMessage,
} from '../types/messages/SubscribeMessage';

import { Logger } from '../logging/Logger';
import { EventHandler, ISubscription, LogLevel } from '../types/Connection';
import { EWampMessageID, WampDict, WampID, WampList, WampURI } from '../types/messages/MessageTypes';
import { WampMessage } from '../types/Protocol';
import { Deferred } from '../util/deferred';
import { PendingMap } from '../util/map';

class MultiSubscription {
  public onUnsubscribed: Deferred<void>;
  private handlers = new Map<WampID, Subscription>();
  private unsubscribed = false;
  constructor(
    public subscriptionID: WampID,
    public readonly uri: WampURI,
    private unsubscribe: (sub: MultiSubscription) => Promise<void>,
  ) {
    this.onUnsubscribed = new Deferred<void>();
    this.reinitCatch();
  }

  public addSubscription(requestID: WampID, sub: Subscription): void {
    if (this.unsubscribed) {
      throw new Error('Subscription is already destroyed');
    }
    this.handlers.set(requestID, sub);
  }

  public async Unsubscribe(requestID: WampID): Promise<void> {
    const sub = this.handlers.get(requestID);
    if (!sub) {
      throw new Error('no such subscription');
    }
    this.handlers.delete(requestID);
    if (this.handlers.size === 0) {
      this.onUnsubscribed.promise.then(() => {
        sub.onUnsubscribed.resolve();
      }, err => {
        sub.onUnsubscribed.reject(err);
      });
      await this.unsubscribe(this);
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

  private reinitCatch(): void {
    this.onUnsubscribed = new Deferred<void>();
    this.onUnsubscribed.promise.then(() => {
      this.unsubscribed = true;
      // This can happen in one of two cases, which is why the loop is necessary
      // First, when the last subscriber unsubscribes, then this array is empty
      // Second: when the router sends actively a UNSUBSCRIBED message to indicate that
      // the subscription was revoked.
      for (const sub of this.handlers) {
        sub[1].onUnsubscribed.resolve();
      }
      this.handlers.clear();
    }, () => {
      this.reinitCatch();
    });
  }
}

class Subscription implements ISubscription {
  public onUnsubscribed = new Deferred<void>();

  constructor(
    public handler: EventHandler<WampList, WampDict>,
    private requestID: WampID,
    private parent: MultiSubscription,
    private logger: Logger,
  ) {
    this.parent.addSubscription(requestID, this);
  }

  public Unsubscribe(): Promise<void> {
    this.logger.log(LogLevel.DEBUG, `ID: ${this.requestID}, Unsubscribing...`);
    return this.parent.Unsubscribe(this.requestID);
  }
  public OnUnsubscribed(): Promise<void> {
    return this.onUnsubscribed.promise;
  }
  public ID(): WampID {
    return this.parent.subscriptionID;
  }
}

export class Subscriber extends MessageProcessor {
  public static GetFeatures(): WampDict {
    return {
      subscriber: {
        features: {
          publisher_identification: true,
          publication_trustlevels: true,
          pattern_based_subscription: true,
          sharded_subscription: true,
          event_history: true,
        },
      },
    };
  }

  private subs = new PendingMap<WampSubscribedMessage>(EWampMessageID.SUBSCRIBE, EWampMessageID.SUBSCRIBED);
  private unsubs = new PendingMap<WampUnsubscribedMessage>(
    EWampMessageID.UNSUBSCRIBE,
    EWampMessageID.UNSUBSCRIBED,
    msg => {
      const details = msg[2];
      if (!details) {
        return [false, 'invalid router UNSUBSCRIBED'];
      }
      const sub = this.currentSubscriptions.get(details.subscription);
      if (!sub) {
        return [false, 'unexpected router UNSUBSCRIBED'];
      }
      sub.onUnsubscribed.resolve();
      this.currentSubscriptions.delete(details.subscription);
      return [true, ''];
    },
  );
  private currentSubscriptions = new Map<WampID, MultiSubscription>();

  public async Subscribe<
    A extends WampList,
    K extends WampDict
    >(topic: WampURI, handler: EventHandler<A, K>, options?: SubscribeOptions): Promise<ISubscription> {
    if (this.closed) {
      throw new Error('Subscriber already closed');
    }
    options = options || {};
    const requestID = this.idGen.session.ID();

    const msg: WampSubscribeMessage = [
      EWampMessageID.SUBSCRIBE,
      requestID,
      options || {},
      topic,
    ];
    const subscribedPromise = this.subs.PutAndResolve(requestID);
    await this.sender(msg);
    return subscribedPromise.then(subscribed => {
      const subId = subscribed[2];
      this.logger.log(LogLevel.DEBUG, `ID: ${subId}, Subscribing ${topic}`);

      let subscriptionWrapper = this.currentSubscriptions.get(subId);
      if (!subscriptionWrapper) {
        subscriptionWrapper = new MultiSubscription(subId, topic, async sub => await this.sendUnsubscribe(sub));
        this.currentSubscriptions.set(subId, subscriptionWrapper);
      }
      return new Subscription(handler as EventHandler<WampList, WampDict>, requestID, subscriptionWrapper, this.logger);
    });
  }

  protected onClose(): void {
    this.subs.Close();
    this.unsubs.Close();
    for (const currentSub of this.currentSubscriptions) {
      currentSub[1].onUnsubscribed.reject('subscriber closing');
    }
    this.currentSubscriptions.clear();
  }

  protected onMessage(msg: WampMessage): boolean {
    let [handled, success, error] = this.subs.Handle(msg);
    if (handled) {
      if (!success) {
        this.violator(error);
      }
      return true;
    }

    if (msg[0] === EWampMessageID.EVENT) {
      const subId = msg[1];
      const subscription = this.currentSubscriptions.get(subId);
      if (!subscription) {
        this.violator('unexpected EVENT');
        return true;
      }

      this.logger.log(LogLevel.DEBUG, `Subscription ID: ${subId}, Received Event`);
      const details = msg[3];
      details.publicationId = msg[2];
      if (!details.topic) {
        details.topic = subscription.uri;
      }
      subscription.trigger(msg[4] || [], msg[5] || {}, details);

      return true;
    }

    [handled, success, error] = this.unsubs.Handle(msg);
    if (handled && !success) {
      this.violator(error);
    }
    return handled;
  }

  private async sendUnsubscribe(sub: MultiSubscription): Promise<void> {
    const requestID = this.idGen.session.ID();
    const msg: WampUnsubscribeMessage = [
      EWampMessageID.UNSUBSCRIBE,
      requestID,
      sub.subscriptionID,
    ];
    this.unsubs.PutAndResolve(requestID).then(() => {
      this.currentSubscriptions.delete(sub.subscriptionID);
      sub.onUnsubscribed.resolve();
    }, (err: any) => {
      sub.onUnsubscribed.reject(err);
    });
    await this.sender(msg);
  }
}
