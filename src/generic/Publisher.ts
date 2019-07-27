import { Deferred } from 'queueable';
import { MessageProcessor } from './MessageProcessor';

import { IPublication, LogLevel } from '../types/Connection';
import { EWampMessageID, WampDict, WampID, WampList, WampURI } from '../types/messages/MessageTypes';
import { PublishOptions, WampPublishedMessage, WampPublishMessage } from '../types/messages/PublishMessage';
import { WampMessage } from '../types/Protocol';
import { PendingMap } from '../util/map';

export class Publication implements IPublication {
  private onPublished = new Deferred<WampID | null>();
  private resolved = false;
  constructor(private requestID: WampID, expectAck: boolean) {
    if (!expectAck) {
      this.onPublished.resolve(null);
      this.resolved = true;
    }
  }

  public fail(msg: string): void {
    if (!this.resolved) {
      this.resolved = true;
      this.onPublished.reject(msg);
    }
  }

  public acknowledge(publicationId: WampID): void {
    if (this.resolved) {
      throw new Error(`Unexpected acknowledge for publication ${this.requestID}`);
    }
    this.resolved = true;
    this.onPublished.resolve(publicationId);
  }

  public OnPublished(): Promise<WampID | null> {
    return this.onPublished.promise;
  }
}

export class Publisher extends MessageProcessor {
  public static GetFeatures(): WampDict {
    return {
      publisher: {
        features: {
          subscriber_blackwhite_listing: true,
          publisher_exclusion: true,
          publisher_identification: true,
          sharded_subscription: true,
        },
      },
    };
  }

  private publications = new PendingMap<WampPublishedMessage>(EWampMessageID.PUBLISH, EWampMessageID.PUBLISHED);

  public async Publish<
    A extends WampList,
    K extends WampDict
    >(topic: WampURI, args?: A, kwArgs?: K, options?: PublishOptions): Promise<IPublication> {
    if (this.closed) {
      throw new Error('Publisher already closed');
    }
    options = options || {};

    const requestID = this.idGen.session.ID();

    const msg: WampPublishMessage = [
      EWampMessageID.PUBLISH,
      requestID,
      options || {},
      topic,
      args || [],
      kwArgs || {},
    ];
    await this.sender(msg);
    this.logger.log(LogLevel.DEBUG, `ID: ${requestID}, Publishing ${topic}`);

    const publication = new Publication(requestID, !!options.acknowledge);
    if (options.acknowledge) {
      this.publications.PutAndResolve(requestID).then(published => {
        publication.acknowledge(published[2]);
      }, err => {
        publication.fail(err);
      });
    }
    return publication;
  }

  protected onClose(): void {
    this.publications.Close();
  }

  protected async onMessage(msg: WampMessage): Promise<boolean> {
    const [handled, success, error] = this.publications.Handle(msg);
    if (handled && !success) {
      await this.violator(error);
    }
    return handled;
  }
}
