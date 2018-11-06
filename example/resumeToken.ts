import {
  Connection,
  ConnectionCloseInfo,
  JSONSerializer,

  NodeWebSocketTransport,
  Signature,
  TicketAuthProvider,
  WampDict,
  WelcomeDetails,
} from 'kraftfahrstrasse';

import {Deferred} from 'queueable';

const tokenFunc = (authExtra: WampDict): Promise<Signature> => {

  const signature: Signature = {
    signature: 'admin',
    details: {
      'generate-token': true,
    },
  };

  return Promise.resolve(signature);
};

const connection = new Connection({
  endpoint: 'ws://localhost:8001',
  serializer: new JSONSerializer(),
  transport: NodeWebSocketTransport,
  transportOptions: {},
  authProvider: new TicketAuthProvider('admin', tokenFunc),

  logFunction: console.log as any,
  realm: 'slimerp',
});

connection.Open().then(async (welcomeDict: WelcomeDetails) => {
  console.log(welcomeDict.authextra && welcomeDict.authextra['resume-token']);
});
