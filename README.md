# kraftfahrstrasse
Typescript implementation of WAMP protocol.

## Introduction

`kraftfahrstrasse` is another WAMP implementation, which is fully driven by Typescript.
This introduces type safety to the WAMP universe for the first time. We are very proud, we did this.
We also used the newest language features, which mades the code more readable and better to maintain. So, keep in mind, that shipping to ES5 is not intended to work. We never tested that and we don't want to. Our applications, which depend on `kraftfahrstrasse` ships ES6 and it works fine.

We also wanted to keep the bundle size as low as possible, which is made possible by shipping ES6 modules and rely on tree shaking from Webpack 4. So, we have dependencies like `msgpack5` and `ws`, which are installed, but does not get bundled from Webpack 4, if you do not use them. This results in a much smaller bundle size. We aim for a bundle size of `50kB`, which is 5x smaller than `autobahn`.

So, this is the reason, why our configuration seems a bit messy. You have to import the transport, serializer and authProvider, before use them into the configuration. If you import them, Webpack 4 will include them into your bundle, if not, it wont. This is a huge advantage for your bundle size.

## Usage Example

```ts
import {NodeWebSocketTransport} from './transport/NodeWebSocketTransport';
import {Connection} from './generic/Connection';
import {JSONSerializer} from './serialize/JSON';
import {AnonymousAuthProvider} from './auth/Anonymous';

const connection = new Connection({
  endpoint: "ws://localhost:4000",
  serializer: new JSONSerializer(),
  transport: NodeWebSocketTransport,
  transportOptions: {

  },
  authProvider: new AnonymousAuthProvider(),
  logFunction: console.log as any,
  realm: "robulab",
});

const main = async () => {
  await connection.Open();

  const sub = await connection.Subscribe("com.robulab.target.create", (args, kwargs, details) => {
    console.log("Subscription:", args, kwargs, details);
  }, {});
}
main();

```

## Configuration

| Parameter | Type | Description |
|-----------|------| ----------- |
| endpoint | string | `endpoint` describes the URL of your router. |
| realm | string | `realm` describes the realm, which should the client use. |
| transport | ITransport | `transport` describes a class, which is used to transport the data. WAMP supports multiple ways to connect to the router. Common transports are `BrowserWebSocketTransport` or `NodeWebSocketTransport`. Make sure, you import them correctly. |
| serializer | ISerializer | `serializer` describes an instance of ISerializer, which is used to serialize the protocol data for transport. Common serializers are JSON and MsgPack. Make sure, you import them correctly. |
| authProvider | IAuthProvider | `authProvider` describes an instance of IAuthProvider, which is supposed to handle the authentication to the router. Common `authProvider` are Anonymous and Ticket. |
| logFunction | logFunction? | `logFunction` describes a log function, which you can provide to include logs from `kraftfahrstrasse` into your own log management or log style.

### transport

#### BrowserWebSocketTransport
#### NodeWebSocketTransport

### serializer

#### JSONSerializer
#### MSGPackSerialzer

### authProvider
#### AnonymousAuthProvider
#### TicketAuthProvider
#### CookieAuthProvider
#### TLSAuthProvider
