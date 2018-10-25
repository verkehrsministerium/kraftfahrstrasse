import { IMessageProcessor, MessageSender, ProtocolViolator, IDGen } from './MessageProcessor';
import { WampMessage } from '../types/Protocol';
import { WampList, WampDict, WampURI, WampID, EWampMessageID } from '../types/messages/MessageTypes';
import { CallOptions, WampCallMessage, ECallKillMode, WampCancelMessage } from '../types/messages/CallMessage';
import { CallResult } from '../types/Connection';
import { Deferred } from 'queueable';

export class Caller implements IMessageProcessor {
  public static GetFeatures(): WampDict {
    return {
      caller: {
        features: {
          progressive_call_results: true,
          call_timeout: true,
          call_canceling: true,
          caller_identification: true,
          sharded_registration: true,
        }
      }
    }
  }

  private pendingCalls = new Map<WampID, [Deferred<CallResult<WampList, WampDict>>, boolean]>();
  private closed = false;

  constructor (private sender: MessageSender, private violator: ProtocolViolator, private idGen: IDGen) { }

  public Call<
    A extends WampList,
    K extends WampDict,
    RA extends WampList,
    RK extends WampDict
  >(uri: WampURI, args?: A, kwArgs?: K, details?: CallOptions): [Promise<CallResult<RA, RK>>, WampID] {
    if (this.closed) {
      return [Promise.reject("caller closed"), -1];
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
    const result = new Deferred<CallResult<RA, RK>>();
    this.pendingCalls.set(requestID, [result, details.receive_progress]);
    this.sender(msg);
    return [result.promise, requestID];
  }

  public CancelCall(callid: WampID, killMode?: ECallKillMode): void {
    // TODO: Check if call canceling supported by router
    if (this.closed) {
      throw new Error("caller closed");
    }
    const call = this.pendingCalls.get(callid);
    if (!call) {
      throw new Error("no such pending call");
    }
    const msg: WampCancelMessage = [
      EWampMessageID.CANCEL,
      callid,
      { mode: killMode || "" },
    ];
    this.sender(msg);
  }

  public Close(): void {
    this.closed = true;
    for (const call of this.pendingCalls) {
      call[1][0].reject("caller closing");
    }
    this.pendingCalls.clear();
  }

  public ProcessMessage(msg: WampMessage): boolean {
    if (this.closed) {
      return false;
    }
    if (msg[0] === EWampMessageID.ERROR && msg[1] === EWampMessageID.CALL) {
      const callid = msg[2];
      const call = this.pendingCalls.get(callid);
      if (!call) {
        this.violator("unexpected CALL ERROR");
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
        this.violator("unexpected RESULT");
        return true;
      }
      const details = msg[2] || {};
      const resargs = msg[3] || [];
      const reskwargs = msg[4] || {};
      if (details.progress) {
        if (!call[1]) {
          this.violator("unexpected PROGRESS RESULT");
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
