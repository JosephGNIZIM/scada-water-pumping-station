# Installation and Startup

## Prerequisites

- Node.js 18 or newer recommended
- npm

SQLite is used by the backend through Sequelize. The database file is created automatically at `backend/data/scada.sqlite` when the API starts.

## Quick Start

From the repository root:

```bash
npm run install:all
npm run dev
```

This starts:

- the backend on `http://localhost:3000`
- the frontend on `http://localhost:3001`

The frontend proxies `/api` requests to the backend, so you can open the UI directly on `http://localhost:3001`.

## Manual Start

Backend:

```bash
cd backend
npm install
npm run start
```

Frontend:

```bash
cd frontend
npm install
npm run start
```

## Build

From the repository root:

```bash
npm run build
```

Or separately:

```bash
cd backend
npm run build

cd ../frontend
npm run build
```

## Database Notes

- Default database path: `backend/data/scada.sqlite`
- Override path with the `DB_STORAGE` environment variable
- Initial pump, sensor, and alarm records are seeded automatically when the database is empty

## Main Routes

- `GET /api/pumps/status`
- `POST /api/pumps/start`
- `POST /api/pumps/stop`
- `GET /api/sensors/readings`
- `GET /api/alarms`
- `POST /api/alarms/acknowledge/:id`
- `POST /api/alarms/trigger`
