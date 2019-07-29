import { Deferred } from 'queueable';

import { MessageProcessor } from './MessageProcessor';

import { CallResult, LogLevel } from '../types/Connection';
import { CallOptions, ECallKillMode, WampCallMessage, WampCancelMessage } from '../types/messages/CallMessage';
import { EWampMessageID, WampDict, WampID, WampList, WampURI } from '../types/messages/MessageTypes';
import { WampMessage } from '../types/Protocol';

export class Caller extends MessageProcessor {
  public static GetFeatures(): WampDict {
    return {
      caller: {
        features: {
          progressive_call_results: true,
          call_timeout: true,
          call_canceling: true,
          caller_identification: true,
          sharded_registration: true,
        },
      },
    };
  }

  private pendingCalls = new Map<WampID, [Deferred<CallResult<WampList, WampDict>>, boolean]>();

  public Call<
    A extends WampList,
    K extends WampDict,
    RA extends WampList,
    RK extends WampDict
    >(uri: WampURI, args?: A, kwArgs?: K, details?: CallOptions): [Promise<CallResult<RA, RK>>, WampID] {
    if (this.closed) {
      return [Promise.reject('caller closed'), -1];
    }

    const requestID = this.idGen.session.ID();
    details = details || {};
    const msg: WampCallMessage = [
      EWampMessageID.CALL,
      requestID,
      details,
      uri,
      args || [],
      kwArgs || {},
    ];
    this.logger.log(LogLevel.DEBUG, `ID: ${requestID}, Calling ${uri}`);
    const proc = !!details.receive_progress;

    const resultPromise = (async () => {
      const result = new Deferred<CallResult<RA, RK>>();
      await this.sender(msg);
      this.pendingCalls.set(requestID, [result, proc]);
      return result.promise;
    })();
    return [resultPromise, requestID];
  }

  public async CancelCall(callId: WampID, killMode?: ECallKillMode): Promise<void> {
    // TODO: Check if call canceling supported by router
    if (this.closed) {
      throw new Error('caller closed');
    }
    const call = this.pendingCalls.get(callId);
    if (!call) {
      throw new Error('no such pending call');
    }
    const msg: WampCancelMessage = [
      EWampMessageID.CANCEL,
      callId,
      { mode: killMode || '' },
    ];
    this.logger.log(LogLevel.DEBUG, `Cancelling Call ${callId}`);
    await this.sender(msg);
  }

  protected onClose(): void {
    for (const call of this.pendingCalls) {
      call[1][0].reject('caller closing');
    }
    this.pendingCalls.clear();
  }

  protected onMessage(msg: WampMessage): boolean {
    if (msg[0] === EWampMessageID.ERROR && msg[1] === EWampMessageID.CALL) {
      const callid = msg[2];
      this.logger.log(LogLevel.WARNING, `ID: ${callid}, Received Error for Call: ${msg[4]}`);

      const call = this.pendingCalls.get(callid);
      if (!call) {
        this.violator('unexpected CALL ERROR');
        return true;
      }
      this.pendingCalls.delete(callid);
      call[0].reject(msg[4]);
      return true;
    }
    if (msg[0] === EWampMessageID.RESULT) {
      const callid = msg[1];
      const call = this.pendingCalls.get(callid);
      if (!call) {
        this.violator('unexpected RESULT');
        return true;
      }
      const details = msg[2] || {};
      const resargs = msg[3] || [];
      const reskwargs = msg[4] || {};
      if (details.progress) {
        this.logger.log(LogLevel.DEBUG, `ID: ${callid}, Received Progress for Call`);

        if (!call[1]) {
          this.violator('unexpected PROGRESS RESULT');
          return true;
        }
        const nextResult = new Deferred<CallResult<WampList, WampDict>>();
        this.pendingCalls.set(callid, [nextResult, true]);
        call[0].resolve({
          args: resargs,
          kwArgs: reskwargs,
          nextResult: nextResult.promise,
        });
      } else {
        this.logger.log(LogLevel.DEBUG, `ID: ${callid}, Received Result for Call`);
        this.pendingCalls.delete(callid);
        call[0].resolve({
          args: resargs,
          kwArgs: reskwargs,
          nextResult: null,
        });
      }
      return true;
    }
    return false;
  }
}
