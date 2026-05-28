# SCADA Water Pumping Station

## Overview
The SCADA Water Pumping Station project is an open-source desktop Electron application designed to monitor and control water pumping stations. It embeds a backend Node.js API and a frontend Vite/React UI, so it is not just a simple webapp.

## Features
- Real-time monitoring of pump status and sensor readings
- Control of pump operations (start/stop)
- Alarm management system for alerts and notifications
- User-friendly dashboard for easy navigation
- Responsive design for accessibility on various devices

## Prérequis
- Node.js v22 ou supérieur (requis par Electron 37)
- npm v9+
- OS supportés : Windows 10/11 x64 (app desktop Electron), Linux (backend uniquement)
- Git

## Project Structure
```
scada-water-pumping-station
├── backend
│   ├── src
│   │   ├── controllers
│   │   ├── models
│   │   ├── services
│   │   ├── routes
│   │   ├── utils
│   │   └── app.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend
│   ├── public
│   ├── src
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── electron
│   ├── main.js
│   ├── local-server.js
│   ├── splash.html
│   ├── buildResources
│   └── Electron main process & configuration
├── docs
│   ├── architecture.md
│   ├── installation.md
│   └── contribution.md
├── scripts
│   ├── setup.sh
│   ├── start.sh
│   └── test.sh
├── .gitignore
├── LICENSE
└── README.md
```

## Installation
0. Vérifier que Node.js 22+ est installé :
   ```
   node --version
   ```
1. Clone the repository:
   ```
   git clone https://github.com/JosephGNIZIM/scada-water-pumping-station.git
   ```
2. Navigate to the backend directory and install dependencies:
   ```
   cd scada-water-pumping-station/backend
   npm install
   ```
3. Set up the environment variables by copying `.env.example` to `.env` and configuring it as needed.
4. Navigate to the frontend directory and install dependencies:
   ```
   cd ../frontend
   npm install
   ```
5. Start the backend server:
   ```
   cd ../backend
   npm run start
   ```
6. Start the frontend application:
   ```
   cd ../frontend
   npm run dev
   ```
7. Start the Electron desktop app:
   ```
   npm run electron:start
   ```

## Usage
- To run the desktop application directly in development mode, use `npm run electron:start` or `npm run desktop`.
- To run a clean desktop version that uses built static assets instead of the Vite development server, use `npm run desktop:clean`.
- For browser-only development, use `npm run dev` and open `http://localhost:3001`.
- The desktop app starts the embedded backend, the frontend UI and an optional local MQTT broker.
- Use the dashboard to monitor pump status and sensor readings.
- Control pumps and manage alarms through the interface.

## Contributing
Contributions are welcome! Please read the [contribution guidelines](docs/contribution.md) for details on how to get started.

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more information.