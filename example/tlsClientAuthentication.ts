import { Deferred } from 'queueable';
import {
  AnonymousAuthProvider,
  JSONSerializer,
  NodeWebSocketTransport,

  Connection,
  TLSAuthProvider,
  ConnectionCloseInfo,
} from 'kraftfahrstrasse';

import { readFileSync } from "fs";

const connection = new Connection({
  endpoint: 'wss://localhost:8000',
  serializer: new JSONSerializer(),
  transport: NodeWebSocketTransport,
  transportOptions: {
    ca: readFileSync('certs/ca.crt'),
    cert: readFileSync('certs/cert.crt'),
    key: readFileSync('certs/cert.key'),
    rejectUnauthorized: false,
  },
  authProvider: new TLSAuthProvider(),
  logFunction: console.log as any,
  realm: 'slimerp',
});

connection.Open().then(() => {
  console.log("Conncetion open.");
});
