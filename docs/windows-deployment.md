# Windows Deployment Guide

## Goal

Build a Windows installer for the desktop SCADA application based on Electron.

The installer name is:

- `SCADA Water Station`

The generated installer is created in:

- `release/`

## Prerequisites

- Node.js installed on Windows
- npm available in `PATH`
- project dependencies installed

Optional but recommended:

- Mosquitto installed locally in `C:\Program Files\mosquitto\mosquitto.exe`

Alternative:

- place `mosquitto.exe` manually in `electron/bin/mosquitto/`
- or define `MOSQUITTO_PATH`

## Install dependencies

From the project root:

```powershell
npm run install:all
npm install electron electron-builder --save-dev
```

## Run Electron in development mode

This starts:

- backend on port `3000`
- Vite frontend on port `3001`
- Electron desktop shell

Command:

```powershell
npm run electron:start
```

## Build the Windows installer

Command:

```powershell
npm run build:electron
```

This will:

- build the backend
- build the frontend
- package the Electron app
- create an NSIS Windows installer

## Expected installer features

- desktop shortcut
- Start Menu shortcut
- integrated uninstaller
- application icon
- splash screen at startup

## Logs and troubleshooting

Electron logs are written to the user data folder:

- `.../AppData/Roaming/SCADA Water Station/logs/electron.log`

If startup fails, check:

1. port `3000` is free for the backend
2. port `3001` is free for the local frontend server
3. `backend/dist` exists
4. `frontend/dist` exists
5. Mosquitto is either installed or intentionally omitted

## MQTT / Mosquitto notes

If Mosquitto is missing:

- the application can still start
- a warning dialog is shown
- the rest of the SCADA UI remains usable

Electron searches Mosquitto in this order:

1. `MOSQUITTO_PATH`
2. `electron/bin/mosquitto/mosquitto.exe`
3. `C:\Program Files\mosquitto\mosquitto.exe`
4. `C:\Program Files (x86)\mosquitto\mosquitto.exe`
