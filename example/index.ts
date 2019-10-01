import {
  AnonymousAuthProvider,
  Connection,
  ConnectionCloseInfo,
  JSONSerializer,
  NodeWebSocketTransport,
} from '@verkehrsministerium/kraftfahrstrasse';

class Deferred<T> {
  public promise: Promise<T>;
  public reject: any;
  public resolve: any;
  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}

const connection = new Connection({
  endpoint: 'ws://localhost:8001/ws',
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
    console.log('EVENT:', args, kwargs, details.publisher);
  }, {});
  console.log('Subscribed:', sub.ID());
  const handler = async (args, kwargs, details) => {
    console.log('Called with args:', args, kwargs, details);
    const pub = await connection.Publish('foo.baz', args, kwargs, {
      acknowledge: true,
      disclose_me: true,
      exclude_me: false,
    });
    console.log('publish sent');
    pub.OnPublished().then(pub => {
      console.log('publish acknowledge:', pub);
    });
    return {
      args: [],
      kwArgs: {},
    };
  };
  const reg = await Promise.all([
    connection.Register('foo.bar1', handler, { disclose_caller: true, }),
    connection.Register('foo.bar2', handler, { disclose_caller: true, }),
    connection.Register('foo.bar3', handler, { disclose_caller: true, }),
    connection.Register('foo.bar4', handler, { disclose_caller: true, }),
    connection.Register('foo.bar5', handler, { disclose_caller: true, }),
    connection.Register('foo.bar6', handler, { disclose_caller: true, }),
    connection.Register('foo.bar7', handler, { disclose_caller: true, }),
    connection.Register('foo.bar8', handler, { disclose_caller: true, }),
  ]);

  console.log('Registered: ', reg.map(j => j.ID()));


  setTimeout(() => {
    connection.Call('foo.bar')[0].then(() => console.log('Call completed'), err => console.error(err));
  }, 1000);
  setTimeout(() => sub.Unsubscribe().then(() => console.log('Unsubscribed')), 3000);

  try {
    const [res, cid] = connection.Call('foo.bar2');
    const response = await res;
    console.log(response.args, response.kwArgs, cid);
  } catch (err) {
    console.log('Failed to call com.example.rpc', err);
  }
  const closer = new Deferred<ConnectionCloseInfo>();
  setTimeout(async () => {
    await reg[0].Unregister();
    connection.Close().then(closer.resolve, closer.reject);
    console.log('Closed connection');
  }, 3000);
  await closer;
  console.log('Main done');
}

main().catch(err => {
  console.log('Main failed:', err);
});
