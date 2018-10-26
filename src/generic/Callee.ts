import { Deferred } from 'queueable';

import { IDGen, IMessageProcessor, MessageSender, ProtocolViolator } from './MessageProcessor';

import { InvocationDetails, WampYieldMessage } from '../types/messages/CallMessage';
import { EWampMessageID, WampDict, WampID, WampList } from '../types/messages/MessageTypes';
import { RegisterOptions, WampRegisterMessage, WampUnregisterMessage } from '../types/messages/RegisterMessage';

import { CallHandler, CallResult, IRegistration } from '../types/Connection';
import { WampErrorMessage, WampMessage } from '../types/Protocol';

class Registration implements IRegistration {
  public onUnregistered: Deferred<void>;
  constructor(
    private id: WampID,
    public handler: CallHandler<WampList, WampDict, WampList, WampDict>,
    private unregister: (id: WampID) => void,
  ) {
    this.reinitCatch();
  }

  public Unregister(): Promise<void> {
    this.unregister(this.id);
    return this.OnUnregistered();
  }

  public async OnUnregistered(): Promise<void> {
    return this.onUnregistered.promise;
  }

  public ID(): WampID {
    return this.id;
  }

  private reinitCatch(err?: any) {
    if (err !== 'callee closing') {
      this.onUnregistered = new Deferred<void>();
      this.onUnregistered.promise.catch(e => this.reinitCatch(e));
    }
  }
}

class Call {
  public progress = false;
  public cancelled = false;
  private onCancel = new Deferred<void>();
  constructor(
    handler: CallHandler<WampList, WampDict, WampList, WampDict>,
    args: WampList, kwArgs: WampDict, details: InvocationDetails,
    public callid: WampID,
    private sender: (cid: number, msg: WampMessage, finish: boolean) => void,
  ) {
    args = args || [];
    kwArgs = kwArgs || {};
    details = details || {};
    details.onCancel = this.onCancel.promise;

    // We want to actively catch rejected cancel promises.
    // Rejecting this cancel promise means, that the call wasn't canceled and completed, so
    // dropping any error is fine here.
    // tslint:disable-next-line
    this.onCancel.promise.catch(() => {});
    this.progress = details && details.receive_progress;

    setTimeout(() => {
      handler(args, kwArgs, details).then(res => this.onHandlerResult(res), err => this.onHandlerError(err));
    }, 0);
  }

  public cancel(): void {
    if (this.cancelled) {
      return;
    }
    this.cancelled = true;
    this.onCancel.resolve();
  }

  private onHandlerResult(res: CallResult<WampList, WampDict>): void {
    if (!!res.nextResult) {
      res.nextResult.then(r => this.onHandlerResult(r), err => this.onHandlerError(err));
    }
    if (!res.nextResult || this.progress) {
      const yieldmsg: WampYieldMessage = [
        EWampMessageID.YIELD,
        this.callid,
        { progress: !!res.nextResult && this.progress },
        res.args || [],
        res.kwArgs || {},
      ];
      if (!res.nextResult && !this.cancelled) {
        this.onCancel.reject();
      }
      this.sender(this.callid, yieldmsg, !res.nextResult);
    }
  }

  private onHandlerError(err: any): void {
    const errmsg: WampErrorMessage = [
      EWampMessageID.ERROR,
      EWampMessageID.INVOCATION,
      this.callid,
      {},
      'wamp.error.runtime_error',
      [err],
      {},
    ];
    if (!this.cancelled) {
      this.onCancel.reject();
    }
    this.sender(this.callid, errmsg, true);
  }
}

declare type PendingRegistration = [Deferred<IRegistration>, CallHandler<WampList, WampDict, WampList, WampDict>];

export class Callee implements IMessageProcessor {
  public static GetFeatures(): WampDict {
    return {
      callee: {
        progressive_call_results: true,
        call_timeout: true,
        call_canceling: true,
        caller_identification: true,
        call_trustlevels: true,
        pattern_based_registration: true,
        sharded_registration: true,
        shared_registration: true,
      },
    };
  }
  private pendingRegistrations = new Map<WampID, PendingRegistration>();
  private currentRegistrations = new Map<WampID, Registration>();
  private pendingUnregistrations = new Map<WampID, Registration>();
  private runningCalls = new Map<WampID, Call>();

  private closed = false;
  constructor(private sender: MessageSender, private violator: ProtocolViolator, private idGen: IDGen) { }

  public Close(): void {
    this.closed = true;
    for (const pendingReg of this.pendingRegistrations) {
      pendingReg[1][0].reject('callee closing');
    }
    this.pendingRegistrations.clear();
    for (const pendingUnreg of this.pendingUnregistrations) {
      pendingUnreg[1].onUnregistered.reject('callee closing');
    }
    this.pendingUnregistrations.clear();
    for (const pendingCall of this.runningCalls) {
      pendingCall[1].cancel();
    }
    this.runningCalls.clear();
    for (const currentReg of this.currentRegistrations) {
      currentReg[1].onUnregistered.reject('callee closing');
    }
    this.currentRegistrations.clear();
  }

  public Register<
    A extends WampList,
    K extends WampDict,
    RA extends WampList,
    RK extends WampDict
  >(uri: string, handler: CallHandler<A, K, RA, RK>, options?: RegisterOptions): Promise<IRegistration> {
    if (this.closed) {
      return Promise.reject('callee closed');
    }
    const requestID = this.idGen.session.ID();
    const msg: WampRegisterMessage = [
      EWampMessageID.REGISTER,
      requestID,
      options,
      uri,
    ];
    const deferred = new Deferred<IRegistration>();
    this.pendingRegistrations.set(requestID, [deferred, handler]);
    this.sender(msg);
    return deferred.promise;
  }

  public ProcessMessage(msg: WampMessage): boolean {
    if (this.closed) {
      return false;
    }
    if (msg[0] === EWampMessageID.REGISTERED) {
      const requestID = msg[1];
      const pendingReg = this.pendingRegistrations.get(requestID);
      if (!pendingReg) {
        this.violator('unexpected REGISTERED');
        return true;
      }
      this.pendingRegistrations.delete(requestID);
      const regID = msg[2];
      const registration = new Registration(regID, pendingReg[1], id => this.unregister(id));
      this.currentRegistrations.set(regID, registration);
      pendingReg[0].resolve(registration);
      return true;
    }
    if (msg[0] === EWampMessageID.ERROR && msg[1] === EWampMessageID.REGISTER) {
      const requestID = msg[2];
      const pendingReg = this.pendingRegistrations.get(requestID);
      if (!pendingReg) {
        this.violator('unexpected REGISTER ERROR');
        return true;
      }
      this.pendingRegistrations.delete(requestID);
      pendingReg[0].reject(msg[4]);
      return true;
    }
    if (msg[0] === EWampMessageID.UNREGISTERED) {
      if (msg[1] === 0) {
        // Router induced unregister...
        const regID = msg[2].registration;
        const registration = this.currentRegistrations.get(regID);
        if (!registration) {
          this.violator('unexpected router UNREGISTERED');
          return true;
        }
        this.currentRegistrations.delete(regID);
        registration.onUnregistered.resolve();
      } else {
        const requestID = msg[1];
        const registration = this.pendingUnregistrations.get(requestID);
        if (!registration) {
          this.violator('unexpected UNREGISTERED');
          return true;
        }
        this.pendingUnregistrations.delete(requestID);
        this.currentRegistrations.delete(registration.ID());
        registration.onUnregistered.resolve();
      }
      return true;
    }
    if (msg[0] === EWampMessageID.ERROR && msg[1] === EWampMessageID.UNREGISTER) {
      const requestID = msg[2];
      const pendingUnreg = this.pendingUnregistrations.get(requestID);
      if (!pendingUnreg) {
        this.violator('unexpected UNREGISTER ERROR');
        return true;
      }
      this.pendingUnregistrations.delete(requestID);
      pendingUnreg.onUnregistered.reject(msg[4]);
      return true;
    }
    if (msg[0] === EWampMessageID.INVOCATION) {
      const requestID = msg[1];
      const regID = msg[2];
      const reg = this.currentRegistrations.get(regID);
      if (!reg) {
        this.violator('unexpected INVOCATION');
        return true;
      }
      const call = new Call(
        reg.handler, // Call Handler function
        msg[4] || [], // Args or empty array
        msg[5] || {}, // KwArgs or empty object
        msg[3] || {}, // Options or empty object
        requestID,
        (cid, msgToSend, finished) => {
          if (finished) {
            this.runningCalls.delete(cid);
          }
          if (!this.closed) {
            this.sender(msgToSend);
          }
        },
      );
      this.runningCalls.set(requestID, call);
      return true;
    }
    if (msg[0] === EWampMessageID.INTERRUPT) {
      const cid = msg[1];
      const call = this.runningCalls.get(cid);
      if (!call) {
        this.violator('unexpected INTERRUPT');
        return true;
      }
      call.cancel();
      return true;
    }
    return false;
  }

  private unregister(regID: WampID): void {
    if (this.closed) {
      throw new Error('callee closed');
    }
    const requestID = this.idGen.session.ID();
    const reg = this.currentRegistrations.get(regID);
    if (!reg) {
      return;
    }
    const msg: WampUnregisterMessage = [
      EWampMessageID.UNREGISTER,
      requestID,
      regID,
    ];
    this.pendingUnregistrations.set(requestID, reg);
    this.sender(msg);
  }
}
