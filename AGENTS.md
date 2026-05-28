# SCADA Water Pumping Station AI Agent Instructions

## Purpose
This file guides AI coding assistants for the `scada-water-pumping-station` repository. It is meant to help the agent understand the workspace structure, run commands, and avoid unnecessary duplication of documentation.

## Key points for the agent
- This is a monorepo-like Electron project with three main parts:
  1. `backend` - TypeScript/Node.js API using Express, Sequelize, SQLite, JWT, MQTT, and WebSocket-like updates.
  2. `frontend` - React + TypeScript + Vite UI with Redux, Axios, React Router, and Three.js for 3D/visual components.
  3. `electron` - Electron packaging and local server support, with build resources, portable packaging, and Mosquitto MQTT files.

- Prefer editing files in the appropriate subproject:
  - Backend logic: `backend/src/**`
  - Frontend UI: `frontend/src/**`
  - Dev/start scripts: `scripts/**`
  - Electron packaging configuration: `electron/**`

- The root `package.json` orchestrates workspace commands. Use these first when asked to run or fix the app.

## Recommended commands
From repo root:
- `npm run install:all` - install dependencies for both backend and frontend
- `npm run dev` - start backend and frontend for local development
- `npm run build` - build both backend and frontend
- `npm run check-env` - validate build outputs and required Electron resources
- `npm run electron:start` - launch Electron in dev mode
- `npm run build:electron` - build Windows portable Electron package

Backend-specific:
- `npm --prefix backend run start`
- `npm --prefix backend run build`
- `npm --prefix backend run test`

Frontend-specific:
- `npm --prefix frontend run start`
- `npm --prefix frontend run build`
- `npm --prefix frontend run test`

## Important repo docs
- [README.md](README.md)
- [docs/architecture.md](docs/architecture.md)
- [docs/installation.md](docs/installation.md)
- [docs/contribution.md](docs/contribution.md)

> Do not copy large sections from these docs. Link to them and summarize only the relevant points.

## Codebase conventions and notes
- The frontend entry point is `frontend/src/index.tsx`; pages and major UI are under `frontend/src/pages` and `frontend/src/components`.
- The backend entry point is `backend/src/app.ts`; controllers are under `backend/src/controllers`, business logic is under `backend/src/services`, models under `backend/src/models`, and routes under `backend/src/routes`.
- The repository uses TypeScript in both backend and frontend, but the Electron packaging layer is plain JavaScript.
- If asked about environment or startup issues, inspect `scripts/dev.js` and `scripts/electron-dev.js` first because they manage port selection and service startup.

## When working with this repo
- Always preserve existing API route shapes and frontend state management unless asked to refactor.
- Prefer small, targeted changes and verify behaviour with the relevant local dev command.
- When answering questions about setup or architecture, cite the repo docs rather than inventing missing details.

## Suggested next customization files
- Create a dedicated skill for `frontend` UI and state conventions.
- Create a dedicated skill for `backend` API and model patterns.
- Create a hook or prompt for `npm run dev` / `electron:start` diagnostics.
