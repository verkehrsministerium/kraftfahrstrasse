import {
  AnonymousAuthProvider,
  Connection,
  JSONSerializer,
  NodeWebSocketTransport,
} from '@verkehrsministerium/kraftfahrstrasse';

const ROUTER_ADDRESS = process.env.ROUTER_ADDRESS || process.exit(1);

async function main() {
  const connection = new Connection({
    endpoint: ROUTER_ADDRESS,
    realm: 'realm1',

    serializer: new JSONSerializer(),
    transport: NodeWebSocketTransport,
    authProvider: new AnonymousAuthProvider(),

    logFunction: (level: String, timestamp: Date, file: String, msg: String) => {
      if (level === 'INFO' || level === 'WARNING' || level === 'ERROR') {
        console.log(level, timestamp, file, msg);
      }
    },
  });

  try {
    await connection.Open();
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
  connection.Subscribe(
    'scenario.high_load',
    () => {},
  );

  let msgs = 0;

  setInterval(() => {
    console.log(`${msgs} per second`);
    msgs = 0;
  }, 1000);

  while (true) {
    try {
      await connection.Publish('scenario.high_load');
      msgs += 1;
    } catch (err) {}
  }
}

main();
