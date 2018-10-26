import { IAuthProvider, Signature } from '../types/AuthProvider';
import { WampDict } from '../types/messages/MessageTypes';

export class TransportLevelProvider implements IAuthProvider {
  constructor(private authID: string, private name: string) {}
  public IsTransportLevel(): boolean {
    // AnonymousAuthProvider is considered a 'transport level authentication provider.'
    return true;
  }
  public ComputeChallenge(_: WampDict): Promise<Signature> {
    return Promise.reject('not supported in transport level authentiator');
  }
  public AuthID(): string {
    return this.authID;
  }
  public AuthMethod(): string {
    return this.name;
  }
}
