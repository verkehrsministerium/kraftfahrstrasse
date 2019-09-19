
import { Deferred } from './deferred';

import { EWampMessageID, WampID } from '../types/messages/MessageTypes';
import { WampMessage } from '../types/Protocol';

export class PendingMap<TSucMsg extends WampMessage> {
  private pendings = new Map<WampID, Deferred<TSucMsg>>();
  private closed = false;

  constructor(
    private initMsg: EWampMessageID,
    private successMsg: EWampMessageID,
    private emptyRequest?: (msg: TSucMsg) => [boolean, string],
  ) { }

  public Close(): void {
    this.closed = true;
    for (const pending of this.pendings) {
      pending[1].reject('closing');
    }
    this.pendings.clear();
  }

  public PutAndResolve(id: WampID): Promise<TSucMsg> {
    const deferred = new Deferred<TSucMsg>();
    this.pendings.set(id, deferred);
    return deferred.promise;
  }

  public Handle(msg: WampMessage): [boolean, boolean, string] {
    if (this.closed) {
      return [false, true, ''];
    }
    if (msg[0] === this.successMsg) {
      const requestID = msg[1];
      if (requestID === 0 && !!this.emptyRequest) {
        const [success, error] = this.emptyRequest(msg as TSucMsg);
        return [true, success, error];
      }
      const pendingRequest = this.getAndDelete(requestID as WampID);
      if (!pendingRequest) {
        return [true, false, 'unexpected ' + EWampMessageID[this.successMsg]];
      }
      pendingRequest.resolve(msg as TSucMsg);
      return [true, true, ''];
    }

    if (msg[0] === EWampMessageID.ERROR && msg[1] === this.initMsg) {
      const requestID = msg[2];
      const pendingRequest = this.getAndDelete(requestID);
      if (!pendingRequest) {
        return [true, false, 'unexpected ' + EWampMessageID[this.initMsg] + ' ERROR'];
      }
      pendingRequest.reject(msg[4]);
      return [true, true, ''];
    }
    return [false, true, ''];
  }

  private getAndDelete(id: WampID): Deferred<TSucMsg> | null {
    const val = this.pendings.get(id);
    this.pendings.delete(id);
    return val || null;
  }
}
