import { TransportLevelProvider } from './TransportProvider';

/**
 * AnonymousAuthProvider is a class used to represent a login without a password.
 * It uses the authmethod `anonymous` and a configurable authid (username).
 * @category auth
 */
export class AnonymousAuthProvider extends TransportLevelProvider {
  /**
   * Creates a new instance of the AnonymousAuthProvider.
   * @param authid The username to authenticate as (default: `anonymous`)
   */
  constructor(authid?: string) {
    super(authid || 'anonymous', 'anonymous');
  }
}
