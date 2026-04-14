const { spawn } = require('child_process');
const net = require('net');

const isWin = process.platform === 'win32';
const command = isWin ? 'cmd' : 'npm';
const electronCommand = isWin ? 'cmd' : 'npx';

const children = [];

const spawnProcess = (name, args, env = {}) => {
  const child = spawn(command, isWin ? ['/c', ...args] : args, {
    stdio: ['inherit', 'pipe', 'pipe'],
    windowsHide: false,
    env: { ...process.env, ...env },
  });

  child.stdout.on('data', (data) => process.stdout.write(`[${name}] ${data}`));
  child.stderr.on('data', (data) => process.stderr.write(`[${name}] ${data}`));
  children.push(child);
  return child;
};

const waitForPort = (port, timeoutMs = 120000) =>
  new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const tryConnect = () => {
      const socket = net.createConnection({ port, host: '127.0.0.1' });
      socket.once('connect', () => {
        socket.end();
        resolve();
      });
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`Timeout waiting for port ${port}`));
          return;
        }
        setTimeout(tryConnect, 1000);
      });
    };

    tryConnect();
  });

const shutdown = () => {
  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

(async () => {
  spawnProcess('backend', ['npm', '--prefix', 'backend', 'run', 'start']);
  spawnProcess('frontend', ['npm', '--prefix', 'frontend', 'run', 'start'], { ELECTRON_DEV: '1' });

  await waitForPort(3000);
  await waitForPort(3001);

  const electron = spawn(
    electronCommand,
    isWin ? ['/c', 'npx', 'electron', 'electron/main.js'] : ['electron', 'electron/main.js'],
    {
      stdio: 'inherit',
      env: { ...process.env, ELECTRON_DEV: '1' },
      windowsHide: false,
    },
  );

  children.push(electron);
  electron.on('exit', () => shutdown());
})().catch((error) => {
  console.error(error.message);
  shutdown();
  process.exit(1);
});
