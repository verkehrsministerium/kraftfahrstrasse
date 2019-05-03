import { Deferred } from 'queueable';

import { MessageProcessor } from './MessageProcessor';

import { InvocationDetails, WampYieldMessage } from '../types/messages/CallMessage';
import { EWampMessageID, WampDict, WampID, WampList } from '../types/messages/MessageTypes';
import {
  RegisterOptions,
  WampRegisteredMessage,
  WampRegisterMessage,
  WampUnregisteredMessage,
  WampUnregisterMessage,
} from '../types/messages/RegisterMessage';

import Logger from '../logging/Logger';
import { CallHandler, CallResult, IRegistration, LogLevel } from '../types/Connection';
import { WampErrorMessage, WampMessage } from '../types/Protocol';
import { PendingMap } from '../util/map';

class Registration implements IRegistration {
  public onUnregistered = new Deferred<void>();
  constructor(
    private id: WampID,
    public handler: CallHandler<WampList, WampDict, WampList, WampDict>,
    private unregister: (reg: Registration) => void,
  ) {
    this.onUnregistered.promise.catch(e => this.reinitCatch(e));
  }

  public Unregister(): Promise<void> {
    this.unregister(this);
    return this.OnUnregistered();
  }

  public async OnUnregistered(): Promise<void> {
    return this.onUnregistered.promise;
  }

  public ID(): WampID {
    return this.id;
  }

  private reinitCatch(err?: any) {
    if (err !== 'closing') {
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
    private logger: Logger,
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
    this.progress = details && !!details.receive_progress;

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
      this.logger.log(LogLevel.DEBUG, `ID: ${this.callid}, Sending Yield`);
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
    this.logger.log(LogLevel.DEBUG, `ID: ${this.callid}, Sending Error`);
    this.sender(this.callid, errmsg, true);
  }
}

export class Callee extends MessageProcessor {
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
  private regs = new PendingMap<WampRegisteredMessage>(EWampMessageID.REGISTER, EWampMessageID.REGISTERED);
  private unregs = new PendingMap<WampUnregisteredMessage>(
    EWampMessageID.UNREGISTER,
    EWampMessageID.UNREGISTERED,
    msg => {
      if (!msg[2]) {
        return [false, 'invalid router UNREGISTERED'];
      }
      // Router induced unregister...
      const regID = msg[2].registration;
      const registration = this.currentRegistrations.get(regID);
      if (!registration) {
        return [false, 'unexpected router UNREGISTERED'];
      }
      this.currentRegistrations.delete(regID);
      registration.onUnregistered.resolve();
      return [true, ''];
    },
  );
  private currentRegistrations = new Map<WampID, Registration>();
  private runningCalls = new Map<WampID, Call>();

  public async Register<
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
      options || {},
      uri,
    ];
    this.logger.log(LogLevel.DEBUG, `ID: ${requestID}, Registering ${uri}`);
    this.sender(msg);
    const registered = await this.regs.PutAndResolve(requestID);
    const regID = registered[2];
    const registration = new Registration(regID, handler as any, id => this.unregister(id));
    this.currentRegistrations.set(regID, registration);
    return registration;
  }

  protected onClose(): void {
    this.regs.Close();
    this.unregs.Close();
    for (const pendingCall of this.runningCalls) {
      pendingCall[1].cancel();
    }
    this.runningCalls.clear();
    for (const currentReg of this.currentRegistrations) {
      currentReg[1].onUnregistered.reject('callee closing');
    }
    this.currentRegistrations.clear();
  }

  protected onMessage(msg: WampMessage): boolean {
    let [handled, success, error] = this.regs.Handle(msg);
    if (handled) {
      if (!success) {
        this.violator(error);
      }
      return true;
    }
    [handled, success, error] = this.unregs.Handle(msg);
    if (handled) {
      if (!success) {
        this.violator(error);
      }
      return true;
    }
    if (msg[0] === EWampMessageID.INVOCATION) {
      const [, requestID, regID, details, args, kwargs] = msg;
      const reg = this.currentRegistrations.get(regID);
      if (!reg) {
        this.violator('unexpected INVOCATION');
        return true;
      }
      const call = new Call(
        reg.handler, // Call Handler function
        args || [], // Args or empty array
        kwargs || {}, // KwArgs or empty object
        details || {}, // Options or empty object
        requestID,
        (cid, msgToSend, finished) => {
          if (finished) {
            this.runningCalls.delete(cid);
          }
          if (!this.closed) {
            this.sender(msgToSend);
          }
        },
        this.logger,
      );

      this.logger.log(LogLevel.DEBUG, `ID: ${requestID}, Received Call`);
      this.runningCalls.set(requestID, call);
      return true;
    }
    if (msg[0] === EWampMessageID.INTERRUPT) {
      const requestID = msg[1];
      const call = this.runningCalls.get(requestID);
      if (!call) {
        this.violator('unexpected INTERRUPT');
      } else {
        this.logger.log(LogLevel.DEBUG, `ID: ${requestID}, Received Cancellation Request`);
        call.cancel();
      }
      return true;
    }
    return false;
  }

  private unregister(reg: Registration): void {
    if (this.closed) {
      throw new Error('callee closed');
    }
    const requestID = this.idGen.session.ID();
    const msg: WampUnregisterMessage = [
      EWampMessageID.UNREGISTER,
      requestID,
      reg.ID(),
    ];
    this.unregs.PutAndResolve(requestID).then(() => {
      this.currentRegistrations.delete(reg.ID());
      reg.onUnregistered.resolve();
    }, err => {
      reg.onUnregistered.reject(err);
    });
    this.sender(msg);
  }
}
