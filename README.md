# Mermaid Live Editor with Node.js & SQLite Backend

[简体中文](README.zh.md) | English

This project extends the official [mermaid-live-editor](https://github.com/mermaid-js/mermaid-live-editor) with a robust, persistent **Node.js (Express + better-sqlite3)** backend. It enables seamless cloud-persisted storage, cross-device editing, diagram project management, and automated debounced synchronization.

---

## Architecture Overview

- **Frontend (`mermaid-live-editor/`)**: Built with SvelteKit and TypeScript (official upstream submodule). Features a "My Projects" dashboard, automatic 1.5s debounced synchronization to backend storage, editable project titles, and visual save status indicators.
- **Backend (`backend/`)**: Robust REST API powered by **Node.js (LTS)**, **Express**, and **`better-sqlite3`**. Includes automatic migration on startup, CORS headers, single-file SQLite database storage, and automated Vitest test suite.

```
+--------------------------+       HTTP REST API       +-------------------------+
|   Mermaid Live Editor    | <-----------------------> |   Node.js API Server    |
|   (Frontend :80/:3000)   |   (CORS / JSON DTOs)      |     (Backend :8080)     |
+--------------------------+                           +-------------------------+
                                                                    |
                                                                    v
                                                            +---------------+
                                                            | SQLite DB     |
                                                            | (mermaid.db)  |
                                                            +---------------+
```

---

## Features

- **Project Dashboard (`/projects`)**:
  - View all saved Mermaid diagrams and flowcharts in SQLite.
  - Real-time client-side search by diagram title or code snippet.
  - Create new projects and delete existing ones with instant confirmation.
- **Auto-Syncing Cloud Storage (`/edit?projectId=xxx`)**:
  - Real-time debounced save (1.5s) on diagram code or title edits.
  - Save status indicators: *Saving...*, *Saved*, or *Save failed (Click to retry)*.
  - Dynamic URL synchronization without page reload.
- **Full-Stack Docker Compose Orchestration**:
  - One-click production deployment for both frontend and backend with persistent data volumes.
  - Hot-reloading development compose configuration.
- **Bilingual Documentation & i18n Aligned**:
  - Fully bilingual documentation (English & Simplified Chinese).
  - Clean English UI matching official Mermaid Live Editor design language.

---

## Prerequisites

- **Node.js**: `>= 20` (LTS recommended)
- **pnpm**: `>= 9` (Recommended 10+)
- **Docker & Docker Compose** (Optional, for containerized deployment)

---

## Quick Start

### Method 1: Local Development

#### 1. Start the Backend API
```bash
cd backend
pnpm install
pnpm dev
```
The backend API server starts at `http://localhost:8080`. On first run, it automatically initializes the SQLite database at `backend/data/mermaid.db`.

#### 2. Start the Frontend Live Editor
```bash
cd mermaid-live-editor
pnpm install
pnpm dev
```
The frontend editor starts at `http://localhost:3000` (or `:5173`).

---

### Method 2: Docker Deployment

By default, **only the frontend container exposes a port to the host** (port `80`). The backend container communicates exclusively over Docker's internal network, enhancing security and isolating backend services.

#### Production Mode (Full-Stack)
```bash
# Start frontend and backend services with persistent volume
docker compose up -d

# View service logs
docker compose logs -f
```
The editor will be accessible at `http://localhost` (or `http://localhost:80`).

#### Development Mode (with Source Mount & Hot Reload)
```bash
docker compose -f docker-compose.dev.yml up
```

---

## Deployment Modes & Configuration

You can easily select one of three deployment modes via the `API_BASE_URL` environment variable:

| Mode | `API_BASE_URL` Setting | Description |
|---|---|---|
| **1. Same-Origin Internal Proxy (Default)** | Leave empty / unset | Frontend uses relative path `/api`, proxied by frontend Nginx directly to backend container. No CORS required, single exposed port. |
| **2. Shared Domain / Gateway** | `API_BASE_URL=https://example.com/api` | Frontend directly requests this absolute URL, suitable for unified reverse proxy or gateway configurations. |
| **3. Standalone API Domain (CORS)** | `API_BASE_URL=https://api.example.com` | Frontend sends cross-origin requests to independent backend domain. Backend includes CORS headers and supports both `/api/projects` and `/projects`. |

---

## Environment Variables

Copy `.env.example` to `.env` or configure directly:

| Variable | Target | Default | Description |
|---|---|---|---|
| `APP_FRONTEND_PORT` | Frontend | `80` | Host port mapped to frontend container (replaces `FRONTEND_PORT`). |
| `API_BASE_URL` | Frontend | *(Empty)* | Runtime API base URL. Empty uses internal Nginx reverse proxy. |
| `PORT` | Backend | `8080` | Internal listening port inside the backend container. |
| `DB_PATH` | Backend | `/app/data/mermaid.db` | SQLite database file path. |
| `NODE_ENV` | Backend | `production` | Node.js execution environment. |
| `APP_BACKEND_PORT` | Backend *(Optional)* | *(Unset)* | Optional host port mapping for backend debugging (e.g. `8080`). |

Example `.env`:
```env
# Frontend Service Configuration
APP_FRONTEND_PORT=80
API_BASE_URL=

# Backend Configuration (Internal container settings)
PORT=8080
DB_PATH=/app/data/mermaid.db
NODE_ENV=production

# Optional: Host port mapping for backend debugging
# APP_BACKEND_PORT=8080
```

---

## Documentation Links

- [Backend API Documentation (English)](backend/README.md) | [后端 API 文档 (中文)](backend/README.zh.md)
- [Contributing Guidelines (English)](CONTRIBUTING.md) | [贡献指南 (中文)](CONTRIBUTING.zh.md)
- [Development Roadmap](ROADMAP.md)

---

## License

[MIT License](LICENSE)
