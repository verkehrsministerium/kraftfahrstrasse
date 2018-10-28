# kraftfahrstrasse - TypeScript WAMP client library for node/browsers

[![Maintainability](https://api.codeclimate.com/v1/badges/b84ab82bb912d3ee92f7/maintainability)](https://codeclimate.com/github/Verkehrsministerium/kraftfahrstrasse/maintainability) 
[![Travis (.org)](https://img.shields.io/travis/Verkehrsministerium/kraftfahrstrasse.svg)](https://travis-ci.org/Verkehrsministerium/kraftfahrstrasse)


## Introduction

`kraftfahrstrasse` is another WAMP implementation, which is fully driven by Typescript.
This introduces type safety to the WAMP universe for the first time. We are very proud, we did this.
We also used the newest language features, which mades the code more readable and better to maintain.
So, keep in mind, that shipping to ES5 is not intended to work.
We never tested that and we don't want to.
Our applications, which depend on `kraftfahrstrasse` ship ES6 and it works fine.

We also want to keep the bundle size as low as possible, which is made possible by shipping ES6 modules and
rely on ES6 tree shaking.
We have dependencies like `msgpack5` and `ws` which are installed but don't used until you import the modules.
This results in a much smaller bundle size. We aim for a bundle size of `50kB`, which is 5x smaller than `autobahn-js`.

This is the reason why our configuration seems a bit messy. You need to import the transport, serializer and
authentication provider into your main file before you can use it. If you import them, Webpack 4 will include them into
your bundle, if not, it wont. This is a huge advantage for your bundle size.

## Design goals

- Fast
- Feature complete
- Clean and concise usage (i.e. no polymorphic callbacks)
- Simple configuration
- Full static type safety
- Best interopability with `autobahnkreuz` and the `service` libraries, to provide a seamless WAMP experience

## Usage Example

The example below is intended to be run in node, if you'd like to run it in the browser change `NodeWebSocketTransport`
to `BrowserWebSocketTransport`.

```ts
import {
  AnonymousAuthProvider,
  Connection,
  JSONSerializer,
  NodeWebSocketTransport,
} from 'kraftfahrstrasse';

const connection = new Connection({
  endpoint: "ws://localhost:4000", // Provide your broker URL here
  realm: "robulab", // Your realm.

  serializer: new JSONSerializer(), // Provide an **instance** of a ISerializer
  transport: NodeWebSocketTransport, // Provide a **class** of a ITransport (ITransportFactory)
  transportOptions: {
    // Additional options passed directly into the transport constructor.
  },
  authProvider: new AnonymousAuthProvider(), // Pass an **instance** of a IAuthProvider to authenticate

  logFunction: console.log as any, // Optionally, pass a function used to debug kraftfahrstrasse
});

const main = async () => {
  await connection.Open(); // wait until the connection is opened, after this point, you may use
  // .Call, .Register, .Subscribe, .Publish, .CancelCall of the connection object.

  const sub = await connection.Subscribe("com.robulab.target.create", (args, kwargs, details) => {
    console.log("Subscription:", args, kwargs, details);
  }, {});
}
await main();
```

## Configuration

| Parameter | Type | Description |
|-----------|------| ----------- |
| endpoint | string | `endpoint` describes the URL of your router. |
| realm | string | `realm` describes the realm, which should the client use. |
| transport | ITransport | `transport` describes a **class**, which is used to transport the data. WAMP supports multiple ways to connect to the router. Common transports are `BrowserWebSocketTransport` or `NodeWebSocketTransport`. Make sure, you import them correctly. |
| serializer | ISerializer | `serializer` describes an **instance** of ISerializer, which is used to serialize the protocol data for transport. Common serializers are JSON and MsgPack. Make sure, you import them correctly. |
| authProvider | IAuthProvider | `authProvider` describes an **instance** of IAuthProvider, which is supposed to handle the authentication to the router. Common `authProvider` are Anonymous and Ticket or resume token. |
| logFunction | logFunction? | Pass a custom function to include the output of `kraftfahrstrasse` into your own log management or log style.

### Transports

At the moment, we only offer WebSocket based transports. We have one transport for nodejs (using the [ws](https://github.com/websockets/ws) library)
and another transport for browsers, using the native WebSocket object.
HTTP LongPoll and rawsocket transports may be implemented against this interface, however we feel like most people focus
on WebSocket transports.
In the sections of the transports, the possible options are described.

#### BrowserWebSocketTransport

- TBD

#### NodeWebSocketTransport

- TBD

### Serializers

At the moment, we offer a JSONSerializer which is portable across node and the browser, as well as a portable MSGPack
serializer, which relies on [msgpack5](https://github.com/mcollina/msgpack5).
Both serializers confirm to the WAMP spec, however we provide the possibility to extend or write a custom serializer.

#### JSONSerializer

- TBD

#### MSGPackSerialzer

- TBD

### Authentication

WAMP offers different authentication methods, we honor this fact by providing a simple interface which allows us to extend
and customize the authentication process.

WAMP distinguishes between transport level and protocol level authentication, with transport level being TLS Client Authentication,
Cookie Authentication or Anonymous. Transport level authentications don't involve the calculation or presence of a shared
secret or challenge/response at protocol level but instead rely on the transport below the protocol to handle this.

#### AnonymousAuthProvider

AnonymousAuthProvider represents the `anonymous` authentication method, it allows the user to specify a username
(with a fallback on `anonymous` if none is provided).

#### TicketAuthProvider

TicketAuthProvider represents the `ticket` authentication method, using a shared secret to authenticate.
TicketAuthProviders are used when using `kraftfahrstrasse` along with [autobahnkreuz](https://github.com/EmbeddedEnterprises/autobahnkreuz) to authenticate
users.

When using the TicketAuthProvider, the password will **not** be stored within the AuthProvider, but instead the AuthProvider
calls a user defined function to calculate the ticket based on the server issued details object.

#### CookieAuthProvider

- TBD

#### TLSAuthProvider

- TBD
