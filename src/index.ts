import { NodeWebSocketTransport } from './transport/NodeWebSocketTransport';
import { Connection } from './generic/Connection';
import { ConnectionCloseInfo } from './types/Connection';
import { JSONSerializer } from './serialize/JSON';
import { AnonymousAuthProvider } from './auth/Anonymous';
import { Deferred } from 'queueable';

const connection = new Connection({
  endpoint: "ws://localhost:4000",
  serializer: new JSONSerializer(),
  transport: NodeWebSocketTransport,
  transportOptions: {},
  authProvider: new AnonymousAuthProvider(),
  logFunction: console.log as any,
  realm: "robulab",
});

const main = async () => {
  await connection.Open();
  const sub = await connection.Subscribe("com.robulab.target.changed", (args, kwargs, details) => {
    console.log("Subscription:", args, kwargs, details);
  }, {});
  setTimeout(() => sub.Unsubscribe().then(() => console.log("Unsubscribed")), 10000);
  const [res, cid] = connection.Call("com.robulab.target.get-online");
  console.log(await res, cid);
  const closer = new Deferred<ConnectionCloseInfo>();
  setTimeout(() => connection.Close().then(closer.resolve, closer.reject), 20000);
  console.log(await closer);
}

main().then(() => {});



//setTimeout(() => connection.Close().then(console.log.bind(null, "Connection closed")), 10000);
