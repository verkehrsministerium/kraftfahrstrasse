/*
 * kraftfahrstrasse - Public API
 * (c) 2018
 * Fin Christensen
 * Martin Koppehel
 * Johann Wagner
 * Marten Wallewein-Eising
 * Johannes Wünsche
 */

// Export basic types
export { WampID, WampURI, WampDict, WampList } from './types/messages/MessageTypes';

// Export public interfaces to interact with the library
export * from './types/Serializer';
export * from './types/Transport';
export * from './types/AuthProvider';
export * from './types/Connection';

export { WelcomeDetails } from './types/messages/WelcomeMessage';

// Export different transports
export { BrowserWebSocketTransport } from './transport/BrowserWebSocketTransport';
export { NodeWebSocketTransport } from './transport/NodeWebSocketTransport';

// Export different serializers
export { JSONSerializer } from './serialize/JSON';
// To use the MSGPack serialization, you have to import it explicitly

// Export the different authentication providers
export { TransportLevelProvider } from './auth/TransportProvider';
export { TLSAuthProvider } from './auth/TLS';
export { TicketAuthProvider } from './auth/Ticket';
export { CookieAuthProvider } from './auth/Cookie';
export { AnonymousAuthProvider } from './auth/Anonymous';

// Export the main connection object
export { Connection } from './generic/Connection';
