import { Deferred } from 'queueable';
import {
  AnonymousAuthProvider,
  JSONSerializer,
  NodeWebSocketTransport,

  Connection,
  ConnectionCloseInfo,
} from 'kraftfahrstrasse';

const connection = new Connection({
  endpoint: 'ws://localhost:4000',
  serializer: new JSONSerializer(),
  transport: NodeWebSocketTransport,
  transportOptions: {},
  authProvider: new AnonymousAuthProvider(),
  logFunction: console.log as any,
  realm: 'robulab',
});

const main = async () => {
  await connection.Open();
  const sub = await connection.Subscribe('foo.baz', (args, kwargs, details) => {
    console.log('Subscription:', args, kwargs, details);
  }, {});
  console.log("Subscribed:", sub);
  const reg = await connection.Register('foo.bar', async (args, kwargs, details) => {
    console.log('Called with args:', args, kwargs, details);
    const pub = await connection.Publish('foo.baz', args, kwargs, {
      acknowledge: true,
      disclose_me: true,
      exclude_me: false,
    });
    console.log("publish sent:", pub);
    pub.OnPublished().then(pub => {
      console.log("publish acknowledge:", pub);
    })
    return {
      args: [],
      kwArgs: {},
    };
  }, {
    disclose_caller: true,
  });
  setTimeout(async () => {
    await connection.Call('foo.bar');
    console.log("Call completed");
  }, 1000);
  setTimeout(() => sub.Unsubscribe().then(() => console.log('Unsubscribed')), 10000);
  const [res, cid] = connection.Call('com.example.rpc');
  console.log(await res, cid);
  const closer = new Deferred<ConnectionCloseInfo>();
  setTimeout(async () => {
    await reg.Unregister();
    connection.Close().then(closer.resolve, closer.reject);
  }, 20000);
  console.log(await closer);
}

main().then(() => {});



//setTimeout(() => connection.Close().then(console.log.bind(null, 'Connection closed')), 10000);
