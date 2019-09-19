import { TransportLevelProvider } from './TransportProvider';

/**
 * TLS Client Certificate authentication provider.
 * Providing an instance of this class means that the client thinks
 * that it is already authenticated by presenting a TLS client cert on the
 * transport level.
 * @category auth
 */
export class TLSAuthProvider extends TransportLevelProvider {
  /**
   * Creates a new instance of the TLS auth provider.
   * @param authid Username to login as. A certificate might permit logging
   * in to several user names, so present one here.
   * It might be changed by the server, so that's possibly only a 'hint'.
   * (default: '')
   */
  constructor(authid?: string) {
    super(authid || '', 'tls');
  }
}
