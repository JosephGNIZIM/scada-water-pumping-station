const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

const nodeMajor = Number(process.versions.node.split('.')[0]);
const checks = [
  {
    label: 'Node.js version',
    ok: nodeMajor >= 18,
    detail: `Detected ${process.versions.node}`,
    fatal: true,
  },
  {
    label: 'Backend build output',
    ok: fs.existsSync(path.join(projectRoot, 'backend', 'dist', 'app.js')),
    detail: 'backend/dist/app.js',
    fatal: true,
  },
  {
    label: 'Frontend build output',
    ok: fs.existsSync(path.join(projectRoot, 'frontend', 'dist', 'index.html')),
    detail: 'frontend/dist/index.html',
    fatal: true,
  },
  {
    label: 'Electron icon',
    ok: fs.existsSync(path.join(projectRoot, 'electron', 'buildResources', 'icon.ico')),
    detail: 'electron/buildResources/icon.ico',
    fatal: true,
  },
  {
    label: 'Mosquitto availability',
    ok: [
      process.env.MOSQUITTO_PATH,
      path.join(projectRoot, 'electron', 'bin', 'mosquitto', 'mosquitto.exe'),
      'C:\\Program Files\\mosquitto\\mosquitto.exe',
      'C:\\Program Files (x86)\\mosquitto\\mosquitto.exe',
    ].filter(Boolean).some((candidate) => fs.existsSync(candidate)),
    detail: 'Optional, only needed for local MQTT auto-start.',
    fatal: false,
  },
];

let failed = false;

console.log('SCADA Water Station environment check');
console.log('------------------------------------');

for (const check of checks) {
  const prefix = check.ok ? '[OK]' : check.fatal ? '[FAIL]' : '[WARN]';
  console.log(`${prefix} ${check.label} -> ${check.detail}`);
  if (!check.ok && check.fatal) {
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}
