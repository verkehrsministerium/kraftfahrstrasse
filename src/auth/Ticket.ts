import { IAuthProvider, Signature } from '../types/AuthProvider';
import { WampDict } from '../types/messages/MessageTypes';

// Design decision explanation:
// We don't want to keep the password in persistent storage, so we can't just store it at the instance level.
// Instead, we defer the actual password generation to the user of our code and just pass it around as return value.
export type GetTicketFunc = (authExtra: WampDict) => Promise<Signature>;

export class TicketAuthProvider implements IAuthProvider {
  constructor(private authid: string, private ticketFunc: GetTicketFunc, private authmethod?: string) {
    this.authmethod = authmethod || "ticket";
  }

  public AuthID(): string {
    return this.authid;
  }

  public AuthMethod(): string {
    return this.authmethod;
  }

  public ComputeChallenge(extra: WampDict): Promise<Signature> {
    return this.ticketFunc(extra);
  }

  public IsTransportLevel(): boolean {
    return false;
  }
}
