import {Deferred} from 'queueable';

import {CallOptions, ECallKillMode} from '../types/messages/CallMessage';
import {HelloMessageDetails, WampHelloMessage} from '../types/messages/HelloMessage';
import {EWampMessageID, WampDict, WampID, WampList, WampURI} from '../types/messages/MessageTypes';
import {PublishOptions} from '../types/messages/PublishMessage';
import {RegisterOptions} from '../types/messages/RegisterMessage';
import {SubscribeOptions} from '../types/messages/SubscribeMessage';
import {WampAbortMessage, WampChallengeMessage, WampMessage} from '../types/Protocol';

import {GlobalIDGenerator, SessionIDGenerator} from '../util/id';
import {Callee} from './Callee';
import {Caller} from './Caller';
import {ConnectionStateMachine, EConnectionState, EMessageDirection} from './ConnectionStateMachine';
import {IDGen, IMessageProcessorFactory} from './MessageProcessor';
import {Publisher} from './Publisher';
import {Subscriber} from './Subscriber';

import {
  CallHandler,
  CallResult,
  ConnectionCloseError,
  ConnectionCloseInfo,
  ConnectionOpenError,
  ConnectionOptions,
  EventHandler,
  IConnection,
  IPublication,
  IRegistration,
  ISubscription,
  LogLevel,
} from '../types/Connection';
import {WampWelcomeMessage, WelcomeDetails} from '../types/messages/WelcomeMessage';
import {ETransportEventType, ITransport} from '../types/Transport';

const createIdGens = () => {
    return {
      global: new GlobalIDGenerator(),
      session: new SessionIDGenerator(),
    };
};

export class Connection implements IConnection {
    private transport: ITransport | null = null;
    private onOpen: Deferred<WelcomeDetails> | null = null;
    private onClose: Deferred<ConnectionCloseInfo> | null = null;

    // The type of subHandlers has to match the order of the Factories in subFactories
    private subHandlers: [Publisher, Subscriber, Caller, Callee] | null = null;
    private subFactories: IMessageProcessorFactory[] = [Publisher, Subscriber, Caller, Callee];

    private idGen: IDGen;
    private state: ConnectionStateMachine;
    constructor(private connectionOptions: ConnectionOptions) {
      // TODO: Improve logging...
      // tslint:disable-next-line
      this.connectionOptions.transportOptions = this.connectionOptions.transportOptions || {};
      this.state = new ConnectionStateMachine();
      this.idGen = createIdGens();
    }

    public Open(): Promise<WelcomeDetails> {
      if (!!this.transport) {
        return Promise.reject('Transport already opened or opening');
      }
      this.transport = new this.connectionOptions.transport(
        this.connectionOptions.serializer,
        this.connectionOptions.transportOptions,
      );
      this.state = new ConnectionStateMachine();
      setTimeout(() => {
        this.runConnection().catch(err => {
          if (!!this.connectionOptions.logFunction) {
            this.connectionOptions.logFunction(LogLevel.ERROR, new Date(), 'Connection', `MainLoop error: ${err}`);
          }
        });
      }, 0);
      this.onOpen = new Deferred();
      return this.onOpen.promise;
    }

    public OnClose(): Promise<ConnectionCloseInfo> {
      if (!this.onClose) {
        this.onClose = new Deferred();
      }
      return this.onClose.promise;
    }

    public Close(): Promise<ConnectionCloseInfo> {
      if (!this.transport) {
        return Promise.reject('transport is not open');
      }
      this.transport.Send([
        EWampMessageID.GOODBYE,
        { message: 'client shutdown' },
        'wamp.close.normal',
      ]);
      this.state.update([EMessageDirection.SENT, EWampMessageID.GOODBYE]);
      return this.OnClose();
    }

    public CancelCall(callid: WampID, mode?: ECallKillMode): void {
      if (!this.subHandlers) {
        throw new Error('invalid session state');
      }
      this.subHandlers[2].CancelCall(callid, mode);
    }

    public Call<
      A extends WampList,
      K extends WampDict,
      RA extends WampList,
      RK extends WampDict
    >(uri: WampURI, args?: A, kwargs?: K, opts?: CallOptions): [Promise<CallResult<RA, RK>>, WampID] {
      if (!this.subHandlers) {
        return [Promise.reject('invalid session state'), -1];
      }
      return this.subHandlers[2].Call(uri, args, kwargs, opts);
    }

    public Register<
      A extends WampList,
      K extends WampDict,
      RA extends WampList,
      RK extends WampDict
    >(uri: WampURI, handler: CallHandler<A, K, RA, RK>, opts?: RegisterOptions): Promise<IRegistration> {
      if (!this.subHandlers) {
        return Promise.reject('invalid session state');
      }
      return this.subHandlers[3].Register(uri, handler, opts);
    }
    public Subscribe<
      A extends WampList,
      K extends WampDict
    >(uri: WampURI, handler: EventHandler<A, K>, opts?: SubscribeOptions): Promise<ISubscription> {
      if (!this.subHandlers) {
        return Promise.reject('invalid session state');
      }
      return this.subHandlers[1].Subscribe(uri, handler, opts);
    }
    public Publish<
      A extends WampList,
      K extends WampDict
    >(uri: WampURI, args?: A, kwargs?: K, opts?: PublishOptions): Promise<IPublication> {
      if (!this.subHandlers) {
        return Promise.reject('invalid session state');
      }
      return this.subHandlers[0].Publish(uri, args, kwargs, opts);
    }

    private async runConnection(): Promise<void> {
      const endpoint = this.connectionOptions.endpoint;
      for await (const event of this.transport!.Open(endpoint)) {
        switch (event.type) {
          case ETransportEventType.OPEN: {
            this.sendHello();
            break;
          }
          case ETransportEventType.MESSAGE: {
            if (this.state.getState() === EConnectionState.ESTABLISHED) {
              await this.processMessage(event.message);
            } else {
              await this.processSessionMessage(event.message);
            }
            break;
          }
          case ETransportEventType.CLOSE: {
            this.transport = null;
            this.state = new ConnectionStateMachine();
            if (!!this.subHandlers) {
              this.subHandlers.forEach(h => h.Close());
              this.subHandlers = null;
            }
            if (!!this.onClose) {
              if (event.wasClean) {
                this.onClose.resolve({
                  code: event.code,
                  reason: event.reason,
                  wasClean: event.wasClean,
                });
              } else {
                this.onClose.reject(new ConnectionCloseError(event.reason, event.code));
              }
              this.onClose = null;
            }
            break;
          }
        }
        if (event.type === ETransportEventType.CLOSE) {
          break; // exit loop.
        }
      }
    }

    private sendHello(): void {
      const details: HelloMessageDetails = {
        roles: Object.assign({}, ...this.subFactories.map(j => j.GetFeatures())),
        agent: 'kraftfahrstrasse pre-alpha',
      };

      if (!!this.connectionOptions.authProvider) {
        details.authid = this.connectionOptions.authProvider.AuthID();
        details.authmethods = [this.connectionOptions.authProvider.AuthMethod()];
      }

      const msg: WampHelloMessage = [
        EWampMessageID.HELLO,
        this.connectionOptions.realm,
        details,
      ];
      this.transport!.Send(msg);
      this.state.update([EMessageDirection.SENT, EWampMessageID.HELLO]);
    }

    private async processSessionMessage(msg: WampMessage): Promise<void> {
      if (!this.transport) {
        return Promise.reject('transport closed');
      }
      this.state.update([EMessageDirection.RECEIVED, msg[0]]);
      switch (this.state.getState()) {
        case EConnectionState.CHALLENGING: {
          const challengeMsg = msg as WampChallengeMessage;
          const signature = await this.connectionOptions.authProvider.ComputeChallenge(challengeMsg[2] || {});
          this.transport.Send([
            EWampMessageID.AUTHENTICATE,
            signature.signature,
            signature.details || {},
          ]);
          this.state.update([EMessageDirection.SENT, EWampMessageID.AUTHENTICATE]);
          break;
        }
        case EConnectionState.ESTABLISHED: {
          this.idGen = createIdGens();
          this.subHandlers = this.subFactories.map(handlerClass => new handlerClass(msgToSend => {
            this.transport!.Send(msgToSend);
          }, reason => {
            this.handleProtocolViolation(reason);
          }, this.idGen)) as any; // this works.
          // this is, because map on tuples is not defined typesafe-ish.
          // Harr, Harr, Harr

          const estabishedMessage = msg as WampWelcomeMessage;
          this.onOpen!.resolve(estabishedMessage[2]);
          this.onOpen = null;
          break;
        }
        case EConnectionState.CLOSING: {
          // We received a GOODBYE message from the server, so reply with goodbye and shutdown the transport.
          this.transport.Send([
            EWampMessageID.GOODBYE,
            { message: 'clean close' },
            'wamp.close.goodbye_and_out',
          ]);
          this.state.update([EMessageDirection.SENT, EWampMessageID.GOODBYE]);
          this.transport.Close(1000, 'wamp.close.normal');
          break;
        }
        case EConnectionState.CLOSED: {
          // Clean close finished, actually close the transport, so onClose and close Callbacks will be created
          this.transport.Close(1000, 'wamp.close.normal');
          break;
        }
        case EConnectionState.ERROR: {
          // protocol violation, so close the transport not clean (i.e. code 3000)
          // and if we encountered the error, send an ABORT message to the server
          if (msg[0] !== EWampMessageID.ABORT) {
            this.handleProtocolViolation('protocol violation during session establish');
          } else {
            this.transport.Close(3000, msg[2]);
            if (!!this.onOpen) {
              this.onOpen.reject(new ConnectionOpenError(msg[2], msg[1]));
              this.onOpen = null;
            }
          }
          break;
        }
      }
    }

    private async processMessage(msg: WampMessage): Promise<void> {
      if (msg[0] === EWampMessageID.GOODBYE) {
        this.state.update([EMessageDirection.RECEIVED, msg[0]]);
        return;
      }
      let success = false;
      for (const subHandler of this.subHandlers!) {
        success = subHandler.ProcessMessage(msg);
        if (success) {
          break;
        }
      }
      if (!success) {
        if (!!this.connectionOptions.logFunction) {
          this.connectionOptions.logFunction(
            LogLevel.ERROR,
            new Date(),
            'connection',
            `Unhandled message: ${JSON.stringify(msg)}`,
          );
        }
        this.handleProtocolViolation('no handler found for message');
      }
    }

    private handleProtocolViolation(reason: WampURI): void {
      if (!this.transport) {
        if (!!this.connectionOptions.logFunction) {
          this.connectionOptions.logFunction(
            LogLevel.ERROR,
            new Date(),
            'connection',
            'Failed to handle protocol violation: Already closed.',
          );
        }
        return;
      }
      const abortMessage: WampAbortMessage = [
        EWampMessageID.ABORT,
        {message: reason},
        'wamp.error.protocol_violation',
      ];
      if (!!this.connectionOptions.logFunction) {
        this.connectionOptions.logFunction(LogLevel.ERROR, new Date(), 'connection', `Protocol violation: ${reason}`);
      }
      this.transport.Send(abortMessage);
      this.transport.Close(3000, 'protcol_violation');
      if (!!this.onOpen) {
        this.onOpen.reject(new ConnectionOpenError('protcol violation'));
        this.onOpen = null;
      }
    }
}
