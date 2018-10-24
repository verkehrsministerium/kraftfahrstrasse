import { NodeWebSocketTransport } from './transport/NodeWebSocketTransport';
import { Connection } from './generic/Connection';
import { JSONSerializer } from './serialize/JSON';
import { TicketAuthProvider } from './auth/Ticket';

const connection = new Connection({
  endpoint: "wss://dev-test.robulab.com/ws",
  serializer: new JSONSerializer(),
  transport: NodeWebSocketTransport,
  transportOptions: {},
  authProvider: new TicketAuthProvider("admin", async () => ({ signature: "admin" })),
  logFunction: console.log as any,
  realm: "robulab",
});

connection.Open().then(() => {
  console.log("Connection established");
  return connection.Publish("com.robulab.foo.bar", ["foo", 42], null, {
    acknowledge: true,
  });
}).then((pub) => pub.OnPublished())
.then((id) => console.log(`Published: ${id}`), err => console.log);
connection.OnClose().then(info => {
  console.log("Connection closed:", info);
}, err => {
  console.log("Connection closed err:", err);
});

//setTimeout(() => connection.Close().then(console.log.bind(null, "Connection closed")), 10000);
