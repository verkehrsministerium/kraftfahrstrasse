import { WampDict } from './messages/MessageTypes';

export interface IAuthProvider {
  IsTransportLevel(): boolean
  AuthMethod(): string
  AuthID(): string
  ComputeChallenge(extra: WampDict): Promise<string>
}
