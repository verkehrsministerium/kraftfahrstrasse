import { Deferred } from 'queueable';

import {
  AnonymousAuthProvider,
  Connection,
  ConnectionCloseInfo,
  JSONSerializer,
  NodeWebSocketTransport,
} from '@verkehrsministerium/kraftfahrstrasse';

const connection = new Connection({
  endpoint: 'ws://localhost:4000/ws',
  serializer: new JSONSerializer(),
  transport: NodeWebSocketTransport,
  transportOptions: {},
  authProvider: new AnonymousAuthProvider(),
  logFunction: console.log as any,
  realm: 'realm1',
});

const main = async () => {
  await connection.Open();
  const sub = await connection.Subscribe('foo.baz', (args, kwargs, details) => {
    console.log('EVENT:', args, kwargs, details);
  }, {});
  console.log('Subscribed:', sub.ID());
  const reg = await connection.Register('foo.bar', async (args, kwargs, details) => {
    console.log('Called with args:', args, kwargs, details);
    const pub = await connection.Publish('foo.baz', args, kwargs, {
      acknowledge: true,
      disclose_me: true,
      exclude_me: false,
    });
    console.log('publish sent:', pub);
    pub.OnPublished().then(pub => {
      console.log('publish acknowledge:', pub);
    });
    return {
      args: [],
      kwArgs: {},
    };
  }, {
    disclose_caller: true,
  });


  setTimeout(async () => {
    await connection.Call('foo.bar');
    console.log('Call completed');
  }, 1000);
  setTimeout(() => sub.Unsubscribe().then(() => console.log('Unsubscribed')), 3000);

  try {
    const [res, cid] = connection.Call('com.example.rpc');
    console.log(await res, cid);
  } catch (err) {
    console.log('Failed to call com.example.rpc', err);
  }
  const closer = new Deferred<ConnectionCloseInfo>();
  setTimeout(async () => {
    await reg.Unregister();
    connection.Close().then(closer.resolve, closer.reject);
    console.log('Closed connection');
  }, 3000);
  console.log(await closer);
}

main().catch(err => {
  console.log('Main failed:', err);
});
