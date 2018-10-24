import { NodeWebSocketTransport } from './transport/NodeWebSocketTransport';
import { Connection } from './generic/Connection';
import { MSGPackSerializer } from './serialize/MSGPack';
import { TicketAuthProvider } from './auth/Ticket';

const connection = new Connection({
  endpoint: "wss://dev-test.robulab.com/ws",
  serializer: new MSGPackSerializer(),
  transport: NodeWebSocketTransport,
  transportOptions: {},
  authProvider: new TicketAuthProvider("admin", async () => ({ signature: "admin" })),
  logFunction: console.log as any,
  realm: "robulab",
});

connection.Open().then(() => {
  console.log("Connection established");
}, err => {
  console.log(err);
});
connection.OnClose().then(info => {
  console.log("Connection closed:", info);
}, err => {
  console.log("Connection closed err:", err);
});

//setTimeout(() => connection.Close().then(console.log.bind(null, "Connection closed")), 10000);
