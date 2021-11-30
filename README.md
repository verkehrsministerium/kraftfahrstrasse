# kraftfahrstrasse - TypeScript WAMP client library for node/browsers

[![Maintainability](https://api.codeclimate.com/v1/badges/b84ab82bb912d3ee92f7/maintainability)](https://codeclimate.com/github/Verkehrsministerium/kraftfahrstrasse/maintainability) 
[![Travis (.org)](https://img.shields.io/travis/verkehrsministerium/kraftfahrstrasse.svg)](https://travis-ci.org/verkehrsministerium/kraftfahrstrasse) [![Join the chat at https://gitter.im/Verkehrsministerium/kraftfahrstrasse](https://badges.gitter.im/verkehrsministerium/kraftfahrstrasse.svg)](https://gitter.im/verkehrsministerium/kraftfahrstrasse?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)


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
/*
First of all, import all required classes.
You're always going to need the Connection, a serializer and a transport.
For servers which require authentication, an AuthProvider is required.
*/
import {
  AnonymousAuthProvider,
  Connection,
  JSONSerializer,
  NodeWebSocketTransport,
} from '@verkehrsministerium/kraftfahrstrasse';

// Create a new connection object, using the parameters below.
const connection = new Connection({
  endpoint: "ws://localhost:4000", // Provide your broker URL here
  realm: "realm01", // Your realm.

  // The serializer you choose here impacts the handshake performed 
  // with the server, and is fixed during the lifetime 
  // of the connection. 
  // Typically, you would use JSON or MSGPack.
  // Provide an **instance** of a ISerializer here.
  serializer: new JSONSerializer(),
  
  // The transport you choose here selects the way how messages are 
  // sent to the server. 
  // You want to use a WebSocket transport here.
  // Provide a **factory** of a ITransport (ITransportFactory)
  transport: NodeWebSocketTransport, 

  transportOptions: {
    // Additional options passed directly into the transport constructor.
    // Documentation can be found in the documentation of the transport factories
  },

  // This class defines how the handshake with the server works.
  // It is used to provide a username, the authentication method 
  // and,optionally, more details like a password.
  // Pass an **instance** of a IAuthProvider to authenticate
  authProvider: new AnonymousAuthProvider(), 

  // Optionally, pass a function used to debug kraftfahrstrasse
  logFunction: console.log as any, 
});

const main = async () => {
  // wait until the connection is opened, after this point,
  // you may use .Call, .Register, .Subscribe, .Publish,
  // .CancelCall of the connection object.
  await connection.Open(); 
  
  // Example on how to subscribe to a topic
  const sub = await connection.Subscribe(
    "com.example.topic", // Topic
    (args, kwargs, details) => { // Event Handler
      console.log("Subscription:", args, kwargs, details);
    },
    {} // Advanced subscribe options, optional
  );

  // To unsubscribe, use:
  await sub.Unsubscribe();

  // Example on how to publish to a topic
  const pub = await connection.Publish(
    "com.example.topic", // Topic
    ["Hello World"], // Positional Arguments
    {}, // Keyword Arguments (optional)
    { // Advanced options (optional)
      // Request an answer from the router when
      // the publication has been delivered.
      "acknowledge": true, 
      // ...
    }
  );
  const id = await pub.OnPublished();
  console.log('Published event as', id);

  // Register a procedure
  const reg = await connection.Register(
    "com.example.rpc", // Function name
    async (args, kwargs, details) => { // Handler (asynchronous!)
      console.log('Got invoked:', args, kwargs, details);

      // Handlers can also return values.
      return {
        args,
        kwargs,
      };
    },
    {} // Advanced registration options.
  );

  // And unregister:
  await reg.Unregister();

  // Call a remote procedure
  // A call returns **TWO** values:
  // A promise of the call result, and its ID.
  // You can use the Call ID to cancel the call, when the router
  // supports call cancelation.
  const call = connection.Call(
    "com.example.rpc", // Function name
    ["Hello, World"], // Positional Arguments
    {}, // Keyword Arguments
    {}, // Advanced options.
  );

  // So to get the call result:
  const result = await call[0];
  console.log('Got call result:', result);

  // To cancel the running call:
  await connection.CancelCall(result[1], 'kill');
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

No further configuration is supported in a browser context.

#### NodeWebSocketTransport

The NodeWebSocketTransport uses the [ws library](https://github.com/websockets/ws/blob/master/doc/ws.md#class-websocket) under the hood, so head over to their documentation for an up-to-date list of configuration options.
The `transportOptions` dict will be passed directly as `options` argument into the `ws` constructor.

Typically, you would like to set a custom CA, client certificates for TLS Authentication or connect timeout here.

### Serializers

At the moment, we offer a JSONSerializer which is portable across node and the browser, as well as a portable MSGPack
serializer, which relies on [msgpack5](https://github.com/mcollina/msgpack5).
Both serializers confirm to the WAMP spec, however we provide the possibility to extend or write a custom serializer.

#### JSONSerializer

This serializer uses the `JSON` object present in nodeJS and modern browsers to encode and decode json. It follows the WAMP specification for [binary message handling](https://wamp-proto.org/_static/gen/wamp_latest_ietf.html#rfc.section.15).

The subprotocol for the json serializer is: `wamp.2.json`.

#### BrowserMSGPackSerialzer/NodeMSGPackSerializer

This serializer uses [msgpack5](https://github.com/mcollina/msgpack) to provide a more space-efficient serialization. It uses the `wamp.2.msgpack` subprotocol.

**Attention**: This serializer handles binary data as an extension to allow de-/reencoding of binary data at the server side to JSON.
It is therefore NOT compatible with the crossbar.io router.
If you absolutely need binary data, you can write your own msgpack serializer which is compatible with crossbar.io.


### Authentication

WAMP offers different authentication methods, we honor this fact by providing a simple interface which allows us to extend
and customize the authentication process.

WAMP distinguishes between transport level and protocol level authentication, with transport level being TLS Client Authentication,
Cookie Authentication or Anonymous. Transport level authentications don't involve the calculation or presence of a shared
secret or challenge/response at protocol level but instead rely on the transport below the protocol to handle this.

#### AnonymousAuthProvider

[AnonymousAuthProvider](https://github.com/verkehrsministerium/kraftfahrstrasse/blob/master/src/auth/Anonymous.ts) represents the `anonymous` authentication method, it allows the user to specify a username
(with a fallback on `anonymous` if none is provided).

#### TicketAuthProvider

[TicketAuthProvider](https://github.com/verkehrsministerium/kraftfahrstrasse/blob/master/src/auth/Ticket.ts) represents the `ticket` authentication method, using a shared secret to authenticate.
TicketAuthProviders are used when using `kraftfahrstrasse` along with [autobahnkreuz](https://github.com/EmbeddedEnterprises/autobahnkreuz) to authenticate
users.

When using the TicketAuthProvider, the password will **not** be stored within the AuthProvider, but instead the AuthProvider
calls a user defined function to calculate the ticket based on the server issued details object.

#### CookieAuthProvider

The CookieAuthProvider is a transport-level authentication provider, which means that this connection is identified by the client who presented cookies at the connection establishment procedure.
No further configuration is required.

#### TLSAuthProvider

The TLSAuthProvider is a transport-level authentication provider, which means that this connection is identified by the client who presented a TLS client certificate at the connection establishment procedure.
No further configuration is required.

We recommend using the TLSAuthProvider for backend components.
