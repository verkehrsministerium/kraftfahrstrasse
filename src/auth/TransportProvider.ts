import { IAuthProvider, Signature } from '../types/AuthProvider';
import { WampDict } from '../types/messages/MessageTypes';

/**
 * Helper class to configure transport level authentication.
 * This class should not be used directly as authentication provider.
 */
export class TransportLevelProvider implements IAuthProvider {
  /**
   * Creates a new instance.
   * @param authID The username to send to the server
   * @param authmethod The authmethod to send to the server
   */
  constructor(private authID: string, private authmethod: string) {}

  /** @inheritDoc */
  public IsTransportLevel(): boolean {
    // AnonymousAuthProvider is considered a 'transport level authentication provider.'
    return true;
  }

  /** @inheritDoc */
  public ComputeChallenge(_: WampDict): Promise<Signature> {
    return Promise.reject('not supported in transport level authentiator');
  }

  /** @inheritDoc */
  public AuthID(): string {
    return this.authID;
  }

  /** @inheritDoc */
  public AuthMethod(): string {
    return this.authmethod;
  }
}
