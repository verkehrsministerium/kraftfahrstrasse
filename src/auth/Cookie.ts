import { TransportLevelProvider } from './TransportProvider';

/**
 * Cookie authentication provider.
 * Providing an instance of this class means that the client thinks
 * that it is already authenticated by the cookies it sent
 * on the transport level.
 */
export class CookieAuthProvider extends TransportLevelProvider {
  /**
   * Creates a new instance of the cookie auth provider.
   */
  constructor() {
    super('', 'cookie');
  }
}
