const { spawn } = require('child_process');
const net = require('net');
const killPort = require('kill-port');

const isWin = process.platform === 'win32';
const command = isWin ? 'cmd' : 'npm';
const electronCommand = isWin ? 'cmd' : 'npx';
const FRONTEND_PORT_CANDIDATES = [3001, 3002, 3003];

const children = [];
const baseEnv = { ...process.env };

delete baseEnv.ELECTRON_RUN_AS_NODE;

const spawnProcess = (name, args, env = {}) => {
  const child = spawn(command, isWin ? ['/c', ...args] : args, {
    stdio: ['inherit', 'pipe', 'pipe'],
    windowsHide: false,
    env: { ...baseEnv, ...env },
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

const wait = (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs));

const isPortOccupied = (port) =>
  new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', () => resolve(true))
      .once('listening', () => tester.once('close', () => resolve(false)).close())
      .listen(port, '127.0.0.1');
  });

const releasePort = async (port, name) => {
  if (!(await isPortOccupied(port))) {
    return;
  }

  try {
    await killPort(port, 'tcp');
    await wait(500);
  } catch (error) {
    process.stderr.write(`[${name}] Unable to release port ${port} automatically: ${error.message}\n`);
  }
};

const selectFrontendPort = async () => {
  await releasePort(3001, 'frontend');

  for (const port of FRONTEND_PORT_CANDIDATES) {
    if (!(await isPortOccupied(port))) {
      return port;
    }
  }

  throw new Error(`No frontend port available in ${FRONTEND_PORT_CANDIDATES.join(', ')}`);
};

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
  const frontendPort = await selectFrontendPort();
  await releasePort(3000, 'backend');

  spawnProcess('backend', ['npm', '--prefix', 'backend', 'run', 'start']);
  spawnProcess('frontend', ['npm', '--prefix', 'frontend', 'run', 'start'], {
    ELECTRON_DEV: '1',
    FRONTEND_PORT: `${frontendPort}`,
  });

  await waitForPort(3000);
  await waitForPort(frontendPort);

  const electron = spawn(
    electronCommand,
    isWin ? ['/c', 'npx', 'electron', '.'] : ['electron', '.'],
    {
      stdio: 'inherit',
      env: { ...baseEnv, ELECTRON_DEV: '1', FRONTEND_PORT: `${frontendPort}` },
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
