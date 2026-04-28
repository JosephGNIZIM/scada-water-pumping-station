const { app, BrowserWindow, Menu, dialog } = require('electron');
const fs = require('fs');
const net = require('net');
const path = require('path');
const { spawn } = require('child_process');
const killPort = require('kill-port');
const { startLocalServer } = require('./local-server');

const APP_NAME = 'SCADA Water Station';
const APP_VERSION = '1.0.0';
const BACKEND_PORT = 3000;
const DEFAULT_FRONTEND_PORT = 3001;
const FRONTEND_PORT_CANDIDATES = [3001, 3002, 3003];
const MQTT_PORT = 1883;
const isDevMode = process.env.ELECTRON_DEV === '1';

let mainWindow = null;
let splashWindow = null;
let frontendServer = null;
let mqttProcess = null;
let backendController = null;
let mosquittoWarning = null;
let activeFrontendPort = Number.parseInt(process.env.FRONTEND_PORT || `${DEFAULT_FRONTEND_PORT}`, 10);
let shutdownPromise = null;

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
const instanceStatePath = path.join(app.getPath('userData'), 'instance.json');

const getResourcePath = (...segments) => {
  const base = app.isPackaged ? process.resourcesPath : path.join(__dirname, '..');
  return path.join(base, ...segments);
};

const iconPath = getResourcePath('electron', 'buildResources', 'icon.png');
const getFrontendOrigin = () => `http://127.0.0.1:${activeFrontendPort}`;

const wait = (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs));

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

const waitForPortState = async (port, occupied, timeoutMs = 5000) => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if ((await isPortOccupied(port)) === occupied) {
      return true;
    }
    await wait(200);
  }

  return (await isPortOccupied(port)) === occupied;
};

const releasePortWithKillPort = async (port, context) => {
  if (!(await isPortOccupied(port))) {
    return false;
  }

  logger.warn(`Port ${port} occupied (${context}). Attempting cleanup with kill-port.`);

  try {
    await killPort(port, 'tcp');
    const released = await waitForPortState(port, false, 5000);
    if (!released) {
      throw new Error(`Port ${port} is still occupied after kill-port cleanup.`);
    }
    logger.info(`Port ${port} released successfully.`);
    return true;
  } catch (error) {
    logger.warn(`Unable to release port ${port}: ${error.message}`);
    return false;
  }
};

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

const readInstanceState = () => {
  try {
    if (!fs.existsSync(instanceStatePath)) {
      return null;
    }

    return JSON.parse(fs.readFileSync(instanceStatePath, 'utf8'));
  } catch (error) {
    logger.warn(`Unable to read instance state: ${error.message}`);
    return null;
  }
};

const writeInstanceState = () => {
  try {
    fs.mkdirSync(path.dirname(instanceStatePath), { recursive: true });
    fs.writeFileSync(
      instanceStatePath,
      JSON.stringify(
        {
          pid: process.pid,
          startedAt: new Date().toISOString(),
          frontendPort: activeFrontendPort,
          version: APP_VERSION,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    logger.warn(`Unable to write instance state: ${error.message}`);
  }
};

const clearInstanceState = () => {
  try {
    if (fs.existsSync(instanceStatePath)) {
      fs.unlinkSync(instanceStatePath);
    }
  } catch (error) {
    logger.warn(`Unable to clear instance state: ${error.message}`);
  }
};

const isProcessAlive = (pid) => {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const waitForProcessExit = async (pid, timeoutMs = 8000) => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (!isProcessAlive(pid)) {
      return true;
    }
    await wait(250);
  }

  return !isProcessAlive(pid);
};

const terminatePreviousAppInstance = async () => {
  const previousInstance = readInstanceState();
  if (!previousInstance || previousInstance.pid === process.pid) {
    return;
  }

  const previousPid = Number(previousInstance.pid);
  if (!isProcessAlive(previousPid)) {
    clearInstanceState();
    return;
  }

  logger.warn(`Closing previous ${APP_NAME} instance (PID ${previousPid}) before startup.`);

  try {
    process.kill(previousPid);
  } catch (error) {
    logger.warn(`Unable to terminate previous instance ${previousPid}: ${error.message}`);
  }

  await waitForProcessExit(previousPid, 8000);
  clearInstanceState();
};

const selectFrontendPort = async () => {
  if (isDevMode) {
    activeFrontendPort = Number.parseInt(process.env.FRONTEND_PORT || `${DEFAULT_FRONTEND_PORT}`, 10);
    process.env.FRONTEND_PORT = `${activeFrontendPort}`;
    return activeFrontendPort;
  }

  await releasePortWithKillPort(DEFAULT_FRONTEND_PORT, 'default frontend port');

  for (const candidatePort of FRONTEND_PORT_CANDIDATES) {
    if (!(await isPortOccupied(candidatePort))) {
      activeFrontendPort = candidatePort;
      process.env.FRONTEND_PORT = `${candidatePort}`;
      logger.info(`Selected frontend port ${candidatePort}.`);
      return candidatePort;
    }

    logger.warn(`Frontend port ${candidatePort} remains occupied. Trying next candidate.`);
  }

  throw new Error(`Aucun port frontend libre n a ete trouve parmi ${FRONTEND_PORT_CANDIDATES.join(', ')}.`);
};

const releaseFrontendPorts = async () => {
  if (isDevMode) {
    return;
  }

  if (activeFrontendPort) {
    await releasePortWithKillPort(activeFrontendPort, 'frontend shutdown cleanup');
  }
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

  await mainWindow.loadURL(getFrontendOrigin());
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
          click: () => mainWindow?.loadURL(`${getFrontendOrigin()}/settings`),
        },
        {
          label: 'Exporter donnees',
          click: () => mainWindow?.loadURL(`${getFrontendOrigin()}/history`),
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
          click: () => mainWindow?.loadURL(`${getFrontendOrigin()}/tutorial`),
        },
        {
          label: 'A propos',
          click: () => mainWindow?.loadURL(`${getFrontendOrigin()}/about`),
        },
        {
          label: 'Diagnostic',
          click: () => mainWindow?.loadURL(`${getFrontendOrigin()}/diagnostics`),
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
  clearInstanceState();

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

  try {
    await waitForPortState(activeFrontendPort, false, 3000);
  } catch (error) {
    logger.warn(`Unable to confirm frontend port release: ${error.message}`);
  }

  await releaseFrontendPorts();
};

const bootstrap = async () => {
  createSplashWindow();
  updateSplashProgress(12, 'Verification des ports');

  await ensurePortAvailable(BACKEND_PORT, 'le backend');
  await selectFrontendPort();
  writeInstanceState();

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
      port: activeFrontendPort,
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

const startApplication = async () => {
  await terminatePreviousAppInstance();

  const gotSingleInstanceLock = app.requestSingleInstanceLock();
  if (!gotSingleInstanceLock) {
    app.quit();
    return;
  }

  app.on('second-instance', () => {
    if (mainWindow?.isMinimized()) {
      mainWindow.restore();
    }

    if (mainWindow) {
      mainWindow.focus();
    }
  });

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
};

startApplication().catch((error) => {
  logger.error(error.stack || error.message);
  app.quit();
});

app.on('before-quit', (event) => {
  if (shutdownPromise) {
    event.preventDefault();
    return;
  }

  event.preventDefault();
  shutdownPromise = shutdown()
    .catch((error) => {
      logger.warn(`Shutdown cleanup failed: ${error.message}`);
    })
    .finally(() => {
      app.releaseSingleInstanceLock();
      app.exit();
    });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
