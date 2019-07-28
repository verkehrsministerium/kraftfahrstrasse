import { Deferred } from 'queueable';

import { CallOptions, ECallKillMode } from '../types/messages/CallMessage';
import { HelloMessageDetails, WampHelloMessage } from '../types/messages/HelloMessage';
import { EWampMessageID, WampDict, WampID, WampList, WampURI } from '../types/messages/MessageTypes';
import { PublishOptions } from '../types/messages/PublishMessage';
import { RegisterOptions } from '../types/messages/RegisterMessage';
import { SubscribeOptions } from '../types/messages/SubscribeMessage';
import { WampAbortMessage, WampChallengeMessage, WampMessage } from '../types/Protocol';

import { Logger } from '../logging/Logger';
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
import { WampWelcomeMessage, WelcomeDetails } from '../types/messages/WelcomeMessage';
import { ETransportEventType, ITransport } from '../types/Transport';
import { GlobalIDGenerator, SessionIDGenerator } from '../util/id';
import { Callee } from './Callee';
import { Caller } from './Caller';
import { ConnectionStateMachine, EConnectionState, EMessageDirection } from './ConnectionStateMachine';
import { IDGen, IMessageProcessorFactory } from './MessageProcessor';
import { Publisher } from './Publisher';
import { Subscriber } from './Subscriber';

const createIdGens = () => {
  return {
    global: new GlobalIDGenerator(),
    session: new SessionIDGenerator(),
  };
};

export class Connection implements IConnection {

  public sessionId: number | null = null;

  private transport: ITransport | null = null;
  private onOpen: Deferred<WelcomeDetails> | null = null;
  private onClose: Deferred<ConnectionCloseInfo> | null = null;

  // The type of subHandlers has to match the order of the Factories in subFactories
  private subHandlers: [Publisher, Subscriber, Caller, Callee] | null = null;
  private subFactories: IMessageProcessorFactory[] = [Publisher, Subscriber, Caller, Callee];

  private readonly logger: Logger;

  private idGen: IDGen;
  private state: ConnectionStateMachine;
  constructor(private connectionOptions: ConnectionOptions) {
    // TODO: Improve logging...
    // tslint:disable-next-line
    this.connectionOptions.transportOptions = this.connectionOptions.transportOptions || {};
    this.state = new ConnectionStateMachine();
    this.idGen = createIdGens();
    this.logger = new Logger('Connection.ts', connectionOptions.logFunction);
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
    this.onOpen = new Deferred();
    setTimeout(() => {
      this.runConnection().catch(err => {
        this.logger.log(LogLevel.ERROR, `Error in Main Loop: ${err}`);
      });
    }, 0);
    this.logger.log(
      LogLevel.DEBUG,
      `Opened Connection with ${this.connectionOptions.serializer.ProtocolID()} and ${this.transport.name}`,
    );
    return this.onOpen.promise;
  }

  public OnClose(): Promise<ConnectionCloseInfo> {
    if (!this.onClose) {
      this.onClose = new Deferred();
    }
    return this.onClose.promise;
  }

  public async Close(): Promise<ConnectionCloseInfo> {
    if (!this.transport) {
      return Promise.reject('transport is not open');
    }
    await this.transport.Send([
      EWampMessageID.GOODBYE,
      { message: 'client shutdown' },
      'wamp.close.normal',
    ]);

    this.logger.log(LogLevel.DEBUG, 'Closing Connection');
    this.state.update([EMessageDirection.SENT, EWampMessageID.GOODBYE]);
    return this.OnClose();
  }

  public async CancelCall(callid: WampID, mode?: ECallKillMode): Promise<void> {
    if (!this.subHandlers) {
      throw new Error('invalid session state');
    }
    await this.subHandlers[2].CancelCall(callid, mode);
  }

  public async Call<
    A extends WampList,
    K extends WampDict,
    RA extends WampList,
    RK extends WampDict
    >(uri: WampURI, args?: A, kwargs?: K, opts?: CallOptions): Promise<[Promise<CallResult<RA, RK>>, WampID]> {
    if (!this.subHandlers) {
      return [Promise.reject('invalid session state'), -1];
    }
    return await this.subHandlers[2].Call(uri, args, kwargs, opts);
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
          await this.sendHello();
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
        case ETransportEventType.ERROR: {
          if (this.state.getState() !== EConnectionState.ESTABLISHED && !!this.onOpen) {
            this.onOpen.reject(event.error);
            this.onOpen = null;
          }
          break;
        }
        case ETransportEventType.CLOSE: {
          this.transport = null;
          const state = this.state.getState();
          this.state = new ConnectionStateMachine();
          if (!!this.subHandlers) {
            for (const handler of this.subHandlers) {
              await handler.Close();
            }
            this.subHandlers = null;
          }
          if (state !== EConnectionState.ESTABLISHED && !!this.onOpen) {
            this.onOpen.reject(event.reason);
            this.onOpen = null;
          } else if (!!this.onClose) {
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
      if (event.type === ETransportEventType.CLOSE || event.type === ETransportEventType.ERROR) {
        break; // exit loop.
      }
    }
  }

  private async sendHello(): Promise<void> {
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
    await this.transport!.Send(msg);
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
        await this.transport.Send([
          EWampMessageID.AUTHENTICATE,
          signature.signature,
          signature.details || {},
        ]);
        this.state.update([EMessageDirection.SENT, EWampMessageID.AUTHENTICATE]);
        break;
      }
      case EConnectionState.ESTABLISHED: {
        this.idGen = createIdGens();
        this.subHandlers = this.subFactories.map(handlerClass => {
          return new handlerClass(
            async msgToSend => {
              await this.transport!.Send(msgToSend);
            },
            async reason => {
              await this.handleProtocolViolation(reason);
            },
            this.idGen,
            this.logger,
          );
        }) as any; // this works.
        // this is, because map on tuples is not defined typesafe-ish.
        // Harr, Harr, Harr

        const estabishedMessage = msg as WampWelcomeMessage;

        const [, sessionId, welcomeDetails] = estabishedMessage;

        this.sessionId = sessionId;
        this.onOpen!.resolve(welcomeDetails);
        this.onOpen = null;
        break;
      }
      case EConnectionState.CLOSING: {
        // We received a GOODBYE message from the server, so reply with goodbye and shutdown the transport.
        await this.transport.Send([
          EWampMessageID.GOODBYE,
          { message: 'clean close' },
          'wamp.close.goodbye_and_out',
        ]);
        this.state.update([EMessageDirection.SENT, EWampMessageID.GOODBYE]);
        await this.transport.Close(1000, 'wamp.close.normal');
        break;
      }
      case EConnectionState.CLOSED: {
        // Clean close finished, actually close the transport, so onClose and close Callbacks will be created
        await this.transport.Close(1000, 'wamp.close.normal');
        break;
      }
      case EConnectionState.ERROR: {
        // protocol violation, so close the transport not clean (i.e. code 3000)
        // and if we encountered the error, send an ABORT message to the server
        if (msg[0] !== EWampMessageID.ABORT) {
          await this.handleProtocolViolation('protocol violation during session establish');
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
      success = await subHandler.ProcessMessage(msg);
      if (success) {
        break;
      }
    }
    if (!success) {
      this.logger.log(LogLevel.ERROR, `Unhandled message: ${JSON.stringify(msg)}`);
      await this.handleProtocolViolation('no handler found for message');
    }
  }

  private async handleProtocolViolation(reason: WampURI): Promise<void> {
    if (!this.transport) {
      this.logger.log(LogLevel.ERROR, 'Failed to handle protocol violation: Already closed.');
      return;
    }
    const abortMessage: WampAbortMessage = [
      EWampMessageID.ABORT,
      { message: reason },
      'wamp.error.protocol_violation',
    ];

    this.logger.log(LogLevel.ERROR, `Protocol violation: ${reason }`);
    await this.transport.Send(abortMessage);
    this.transport.Close(3000, 'protcol_violation');
    if (!!this.onOpen) {
      this.onOpen.reject(new ConnectionOpenError('protcol violation'));
      this.onOpen = null;
    }
  }
}
