import { TransportLevelProvider } from './TransportProvider';

export class TLSAuthProvider extends TransportLevelProvider {
  constructor(authid?: string) {
    super(authid || '', 'tls');
  }
}
