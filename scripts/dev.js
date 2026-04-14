const { spawn } = require('child_process');

const processes = [
  {
    name: 'backend',
    color: '\x1b[36m',
    command: process.platform === 'win32' ? 'cmd' : 'npm',
    args: process.platform === 'win32'
      ? ['/c', 'npm', '--prefix', 'backend', 'run', 'start']
      : ['--prefix', 'backend', 'run', 'start'],
  },
  {
    name: 'frontend',
    color: '\x1b[33m',
    command: process.platform === 'win32' ? 'cmd' : 'npm',
    args: process.platform === 'win32'
      ? ['/c', 'npm', '--prefix', 'frontend', 'run', 'start']
      : ['--prefix', 'frontend', 'run', 'start'],
  },
];

const children = processes.map(({ name, color, command, args }) => {
  const child = spawn(command, args, {
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: false,
    windowsHide: false,
  });

  child.stdout.on('data', (data) => {
    process.stdout.write(`${color}[${name}]\x1b[0m ${data}`);
  });

  child.stderr.on('data', (data) => {
    process.stderr.write(`${color}[${name}]\x1b[0m ${data}`);
  });

  child.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`${color}[${name}]\x1b[0m exited with code ${code}`);
    }
  });

  return child;
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
