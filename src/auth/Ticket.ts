import { IAuthProvider, Signature } from '../types/AuthProvider';
import { WampDict } from '../types/messages/MessageTypes';

/**
 * GetTicketFunc describes a callback which is used to compute the
 * `challenge` (== password) for ticket based authentication.
 * We don't want to keep the password in persistent storage,
 * so we can't just store it at the instance level.
 * Instead, we defer the actual password generation to the
 * user of our code and just pass it around as return value.
 * @category auth
 *
 * @param authExtra Additional details which are sent by the server
 * which can be used by the client to compute its response.
 * @returns A promise with the correct signature and, possibly details.
 */
export type GetTicketFunc = (authExtra: WampDict) => Promise<Signature>;

/**
 * TicketAuthProvider is a class which is used to login with username and password or any other sort of static token.
 * @category auth
 */
export class TicketAuthProvider implements IAuthProvider {
  /**
   * Creates a new instance of the ticket provider.
   * @param authid The username to send to the server.
   * @param ticketFunc A callback used to retrieve the token/password.
   * @param authmethod Name of the authmethod (default: 'ticket')
   */
  constructor(private authid: string, private ticketFunc: GetTicketFunc, private authmethod: string = 'ticket') { }

  /** @inheritDoc */
  public AuthID(): string {
    return this.authid;
  }

  /** @inheritDoc */
  public AuthMethod(): string {
    return this.authmethod;
  }

  /** @inheritDoc */
  public ComputeChallenge(extra: WampDict): Promise<Signature> {
    return this.ticketFunc(extra);
  }

  /** @inheritDoc */
  public IsTransportLevel(): boolean {
    return false;
  }
}
