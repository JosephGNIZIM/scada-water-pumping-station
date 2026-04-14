# SCADA Water Pumping Station

## Overview
The SCADA Water Pumping Station project is an open-source web application designed to monitor and control water pumping stations. It provides real-time data visualization, pump control, and alarm management through a user-friendly interface.

## Features
- Real-time monitoring of pump status and sensor readings
- Control of pump operations (start/stop)
- Alarm management system for alerts and notifications
- User-friendly dashboard for easy navigation
- Responsive design for accessibility on various devices

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
1. Clone the repository:
   ```
   git clone https://github.com/yourusername/scada-water-pumping-station.git
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

## Usage
- Access the application in your web browser at `http://localhost:3000`.
- Use the dashboard to monitor pump status and sensor readings.
- Control pumps and manage alarms through the interface.

## Contributing
Contributions are welcome! Please read the [contribution guidelines](docs/contribution.md) for details on how to get started.

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more information.