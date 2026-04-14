const { app, BrowserWindow, Menu, dialog } = require('electron');
const fs = require('fs');
const net = require('net');
const path = require('path');
const { spawn } = require('child_process');
const { startLocalServer } = require('./local-server');

const APP_NAME = 'SCADA Water Station';
const APP_VERSION = '1.0.0';
const BACKEND_PORT = 3000;
const FRONTEND_PORT = 3001;
const MQTT_PORT = 1883;
const isDevMode = process.env.ELECTRON_DEV === '1';

let mainWindow = null;
let splashWindow = null;
let frontendServer = null;
let mqttProcess = null;
let backendController = null;
let mosquittoWarning = null;

const createLogger = () => {
  const logDirectory = path.join(app.getPath('userData'), 'logs');
  fs.mkdirSync(logDirectory, { recursive: true });
  const logFile = path.join(logDirectory, 'electron.log');

  const write = (level, message) => {
    const line = `${new Date().toISOString()} [${level}] ${message}\n`;
    fs.appendFileSync(logFile, line);
    if (level === 'ERROR') {
      console.error(line.trim());
    } else {
      console.log(line.trim());
    }
  };

  return {
    info: (message) => write('INFO', message),
    warn: (message) => write('WARN', message),
    error: (message) => write('ERROR', message),
    logFile,
  };
};

const logger = createLogger();

const getResourcePath = (...segments) => {
  const base = app.isPackaged ? process.resourcesPath : path.join(__dirname, '..');
  return path.join(base, ...segments);
};

const iconPath = getResourcePath('electron', 'buildResources', 'icon.png');

const updateSplashProgress = (progress, label) => {
  if (!splashWindow || splashWindow.isDestroyed()) {
    return;
  }

  splashWindow.webContents.executeJavaScript(
    `window.setSplashProgress(${JSON.stringify(progress)}, ${JSON.stringify(label)});`,
  ).catch(() => {});
};

const isPortOccupied = (port) =>
  new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', () => resolve(true))
      .once('listening', () => tester.once('close', () => resolve(false)).close())
      .listen(port, '127.0.0.1');
  });

const ensurePortAvailable = async (port, name) => {
  const occupied = await isPortOccupied(port);
  if (!occupied) {
    return;
  }

  const message = `Le port ${port} est deja occupe. Impossible de lancer ${name}.`;
  logger.error(message);
  await dialog.showMessageBox({
    type: 'error',
    title: APP_NAME,
    message,
  });
  throw new Error(message);
};

const resolveMosquittoPath = () => {
  const candidates = [
    process.env.MOSQUITTO_PATH,
    getResourcePath('electron', 'bin', 'mosquitto', 'mosquitto.exe'),
    'C:\\Program Files\\mosquitto\\mosquitto.exe',
    'C:\\Program Files (x86)\\mosquitto\\mosquitto.exe',
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate));
};

const startMosquitto = async () => {
  const occupied = await isPortOccupied(MQTT_PORT);
  if (occupied) {
    logger.warn(`MQTT port ${MQTT_PORT} already occupied, skipping Mosquitto startup.`);
    mosquittoWarning = null;
    return;
  }

  const mosquittoPath = resolveMosquittoPath();
  if (!mosquittoPath) {
    mosquittoWarning = [
      'Mosquitto executable not found.',
      'The application can continue without the local MQTT broker, but MQTT auto-start is disabled.',
      'To enable it, either set MOSQUITTO_PATH or place mosquitto.exe in electron/bin/mosquitto/.',
      `Logs file: ${logger.logFile}`,
    ].join('\n');
    logger.warn(mosquittoWarning);
    return;
  }

  const configPath = getResourcePath('electron', 'config', 'mosquitto.conf');
  const args = fs.existsSync(configPath) ? ['-c', configPath] : [];

  mqttProcess = spawn(mosquittoPath, args, {
    windowsHide: true,
    detached: false,
  });

  mqttProcess.stdout?.on('data', (data) => logger.info(`[mosquitto] ${data}`));
  mqttProcess.stderr?.on('data', (data) => logger.warn(`[mosquitto] ${data}`));
  mqttProcess.on('exit', (code) => logger.info(`Mosquitto exited with code ${code ?? 0}`));
};

const loadBackendModule = () => {
  const backendEntry = app.isPackaged
    ? getResourcePath('backend', 'dist', 'app.js')
    : path.join(__dirname, '..', 'backend', 'dist', 'app.js');

  // eslint-disable-next-line global-require, import/no-dynamic-require
  return require(backendEntry);
};

const createSplashWindow = () => {
  splashWindow = new BrowserWindow({
    width: 420,
    height: 320,
    frame: false,
    transparent: true,
    resizable: false,
    show: false,
    alwaysOnTop: true,
    icon: iconPath,
    webPreferences: {
      contextIsolation: true,
    },
  });

  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  splashWindow.once('ready-to-show', () => splashWindow?.show());
};

const createMainWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1180,
    minHeight: 760,
    show: false,
    backgroundColor: '#0a0e1a',
    title: APP_NAME,
    icon: iconPath,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  await mainWindow.loadURL(`http://127.0.0.1:${FRONTEND_PORT}`);
  mainWindow.once('ready-to-show', () => {
    splashWindow?.close();
    mainWindow?.show();
  });
};

const createMenu = () => {
  const template = [
    {
      label: 'Fichier',
      submenu: [
        {
          label: 'Parametres',
          click: () => mainWindow?.loadURL(`http://127.0.0.1:${FRONTEND_PORT}/settings`),
        },
        {
          label: 'Exporter donnees',
          click: () => mainWindow?.loadURL(`http://127.0.0.1:${FRONTEND_PORT}/history`),
        },
        { type: 'separator' },
        {
          label: 'Quitter',
          click: () => app.quit(),
        },
      ],
    },
    {
      label: 'Affichage',
      submenu: [
        { role: 'togglefullscreen', label: 'Plein ecran' },
        { role: 'zoomin', label: 'Zoom +' },
        { role: 'zoomout', label: 'Zoom -' },
        { role: 'resetzoom', label: 'Zoom normal' },
        { type: 'separator' },
        { role: 'reload', label: 'Recharger' },
      ],
    },
    {
      label: 'Aide',
      submenu: [
        {
          label: 'Tutoriel',
          click: () => mainWindow?.loadURL(`http://127.0.0.1:${FRONTEND_PORT}/tutorial`),
        },
        {
          label: 'A propos',
          click: () => mainWindow?.loadURL(`http://127.0.0.1:${FRONTEND_PORT}/about`),
        },
        {
          label: 'Diagnostic',
          click: () => mainWindow?.loadURL(`http://127.0.0.1:${FRONTEND_PORT}/diagnostics`),
        },
        {
          label: 'Verifier mises a jour',
          click: () => {
            dialog.showMessageBox({
              type: 'info',
              title: 'Mises a jour',
              message: 'Aucune mise a jour disponible pour le moment.',
            });
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
};

const shutdown = async () => {
  try {
    if (frontendServer?.close) {
      await frontendServer.close();
    }
  } catch (error) {
    logger.warn(`Unable to close frontend server: ${error.message}`);
  }

  try {
    if (backendController?.stopServer) {
      await backendController.stopServer();
    }
  } catch (error) {
    logger.warn(`Unable to stop backend server: ${error.message}`);
  }

  try {
    if (mqttProcess && !mqttProcess.killed) {
      mqttProcess.kill();
    }
  } catch (error) {
    logger.warn(`Unable to stop Mosquitto: ${error.message}`);
  }
};

const bootstrap = async () => {
  createSplashWindow();
  updateSplashProgress(12, 'Verification des ports');

  await ensurePortAvailable(BACKEND_PORT, 'le backend');
  if (!isDevMode) {
    await ensurePortAvailable(FRONTEND_PORT, 'le frontend Electron');
  }

  updateSplashProgress(32, 'Demarrage du backend');
  backendController = loadBackendModule();
  if (typeof backendController.startServer !== 'function') {
    throw new Error('Backend module does not export startServer().');
  }
  await backendController.startServer(BACKEND_PORT);
  logger.info('Backend started successfully.');

  updateSplashProgress(54, 'Demarrage du broker MQTT');
  await startMosquitto();

  updateSplashProgress(74, isDevMode ? 'Connexion au frontend de developpement' : 'Demarrage du frontend local');
  if (!isDevMode) {
    const frontendRoot = app.isPackaged
      ? getResourcePath('frontend', 'dist')
      : path.join(__dirname, '..', 'frontend', 'dist');
    frontendServer = await startLocalServer({
      rootDir: frontendRoot,
      port: FRONTEND_PORT,
      backendPort: BACKEND_PORT,
      logger,
    });
  }

  updateSplashProgress(92, 'Ouverture de l interface');
  createMenu();
  await createMainWindow();
  updateSplashProgress(100, 'Pret');

  if (mosquittoWarning) {
    dialog.showMessageBox({
      type: 'warning',
      title: 'Mosquitto non detecte',
      message: 'Le broker MQTT local n a pas pu etre demarre.',
      detail: `${mosquittoWarning}\n\nConsulte aussi docs/windows-deployment.md pour les options d installation et le packaging portable.`,
    }).catch(() => {});
  }
};

app.whenReady().then(() => {
  bootstrap().catch(async (error) => {
    logger.error(error.stack || error.message);
    await dialog.showMessageBox({
      type: 'error',
      title: APP_NAME,
      message: 'Le demarrage de l application a echoue.',
      detail: `${error.message}\n\nLogs: ${logger.logFile}`,
    });
    app.quit();
  });
});

app.on('before-quit', () => {
  shutdown().catch(() => {});
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
