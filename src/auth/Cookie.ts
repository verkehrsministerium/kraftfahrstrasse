import { TransportLevelProvider } from './TransportProvider';

export class CookieAuthProvider extends TransportLevelProvider {
  constructor() {
    super('', 'cookie');
  }
}
