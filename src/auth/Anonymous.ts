import { TransportLevelProvider } from './TransportProvider';

export class AnonymousAuthProvider extends TransportLevelProvider {
  constructor(authid?: string) {
    super(authid || "anonymous", "anonymous")
  }
}
