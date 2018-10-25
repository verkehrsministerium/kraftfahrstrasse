import { PublishOptions, WampPublishMessage } from '../types/messages/PublishMessage';
import { WampID, WampURI, WampList, WampDict, EWampMessageID } from '../types/messages/MessageTypes';
import { WampMessage } from '../types/Protocol';
import { IPublication } from '../types/Connection';
import { MessageSender, IMessageProcessor, ProtocolViolator, IDGen } from './MessageProcessor';

import { Deferred } from 'queueable';

export class Publication implements IPublication {
  private onPublished = new Deferred<WampID>();
  private resolved = false;
  constructor(private requestID: WampID, expectAck: boolean) {
    if (!expectAck) {
      this.onPublished.reject('acknowledge is not set, expecting no answer');
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

  public OnPublished(): Promise<WampID> {
    return this.onPublished.promise;
  }
}

export class Publisher implements IMessageProcessor {
  public static GetFeatures(): WampDict {
    return {
      publisher: {
        features: {
          subscriber_blackwhite_listing: true,
          publisher_exclusion: true,
          publisher_identification: true,
          sharded_subscription: true,
        }
      }
    }
  }

  private pendingPublications = new Map<number, Publication>();
  private closed = false;
  constructor(private sender: MessageSender, private violator: ProtocolViolator, private idGen: IDGen) {}

  public async Publish<A extends WampList, K extends WampDict>(topic: WampURI, args?: A, kwArgs?: K, options?: PublishOptions): Promise<IPublication> {
    if (this.closed) {
      throw new Error("Publisher already closed");
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
    this.sender(msg);

    const publication = new Publication(requestID, options.acknowledge);
    if (options.acknowledge) {
      this.pendingPublications.set(requestID, publication);
    }
    return publication;
  }

  public Close(): void {
    this.closed = true;
    for (const publication of this.pendingPublications) {
      publication[1].fail("publisher closing");
      // TODO: log
    }
    this.pendingPublications.clear();
  }

  public ProcessMessage(msg: WampMessage): boolean {
    if (this.closed) {
      return false;
    }
    if (msg[0] === EWampMessageID.PUBLISHED) {
      // Published, Sherlock
      const requestID = msg[1];
      const publication = this.pendingPublications.get(requestID);
      this.pendingPublications.delete(requestID);
      if (!publication) {
        this.violator("invalid PUBLISHED message");
        return true;
      }
      publication.acknowledge(msg[2]);
      return true;
    }
    if (msg[0] === EWampMessageID.ERROR && msg[1] === EWampMessageID.PUBLISH) {
      // Publish error
      const requestID = msg[2];
      const publication = this.pendingPublications.get(requestID);
      this.pendingPublications.delete(requestID);
      if (!publication) {
        this.violator("invalid ERROR PUBLISH message");
        return true;
      }
      publication.fail(msg[4]);
      return true;
    }
    return false;
  }
}
