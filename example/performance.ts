import {
  AnonymousAuthProvider,
  Connection,
  JSONSerializer,
  NodeWebSocketTransport,
} from '@verkehrsministerium/kraftfahrstrasse';

const ROUTER_ADDRESS = process.env.ROUTER_ADDRESS || process.exit(1);

function getTimestamp() {
  return +new Date();
}

async function main() {
  const connection = new Connection({
    endpoint: ROUTER_ADDRESS,
    realm: 'realm1',

    serializer: new JSONSerializer(),
    transport: NodeWebSocketTransport,
    transportOptions: {
      perMessageDeflate: false,
    },
    authProvider: new AnonymousAuthProvider(),

    logFunction: (level: String, timestamp: Date, file: String, msg: String) => {
      if (level === 'INFO' || level === 'WARNING' || level === 'ERROR') {
        console.log(level, timestamp, file, msg);
      }
    },
  });
  console.log("opening");

  try {
    await connection.Open();
  } catch (err) {
    console.log(err);
    process.exit(1);
  }

  console.log("subscribing");
  await connection.Subscribe(
    'scenario.high_load',
    () => {},
  );

  let msgs = 0;
  let time = getTimestamp();
  console.log("publishing");

  while (true) {
    let now = getTimestamp();
    if (now - time > 1000) {
      console.log(`${msgs} in ${(now - time) / 1000} second(s)`);
      msgs = 0;
      time = now;
    }
    try {
      await connection.Publish('scenario.high_load');
      msgs += 1;
    } catch (err) {}
  }
}

main();
