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
  const sub = await connection.Subscribe('com.robulab.foo.baz', (args, kwargs, details) => {
    console.log('Subscription:', args, kwargs, details);
  }, {});
  const reg = await connection.Register('com.robulab.foo.bar', async (args, kwargs, details) => {
    console.log('Called with args:', args, kwargs, details);
    await connection.Publish('com.robulab.foo.baz', args, kwargs, {
      acknowledge: true,
      disclose_me: true,
    });
    return {
      args: null,
      kwArgs: null,
      nextResult: null,
    };
  }, {
    disclose_caller: true,
  });
  setTimeout(async () => await connection.Call('com.robulab.foo.bar'), 1000);
  setTimeout(() => sub.Unsubscribe().then(() => console.log('Unsubscribed')), 10000);
  const [res, cid] = connection.Call('com.robulab.target.get-online');
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
