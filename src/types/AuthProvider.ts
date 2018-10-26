import { WampDict } from './messages/MessageTypes';

export type Signature = {
  signature: string;
  details?: WampDict;
};

export interface IAuthProvider {
  IsTransportLevel(): boolean;
  AuthMethod(): string;
  AuthID(): string;
  ComputeChallenge(extra: WampDict): Promise<Signature>;
}
