const net = require('net');
const ports = [3000, 3001, 3002, 3003];

const testPort = (port) =>
  new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      resolve({ port, free: false, error: err.code });
    });
    server.once('listening', () => {
      server.close(() => resolve({ port, free: true }));
    });
    server.listen(port, '127.0.0.1');
  });

(async () => {
  for (const port of ports) {
    const result = await testPort(port);
    console.log(`${port} => ${result.free ? 'free' : 'used'}${result.error ? ' (' + result.error + ')' : ''}`);
  }
})();
