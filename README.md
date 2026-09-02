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

#### Production Mode (Full-Stack)
```bash
# Start frontend and backend services with persistent volume
docker compose up -d

# View service logs
docker compose logs -f
```

#### Development Mode (with Source Mount & Hot Reload)
```bash
docker compose -f docker-compose.dev.yml up
```


---

## Environment Variables

Copy `.env.example` to `.env` or configure directly:

```env
# Backend Configuration
PORT=8080
DB_PATH=./data/mermaid.db
NODE_ENV=production

# Frontend Configuration
VITE_API_BASE_URL=http://localhost:8080/api
```

---

## Documentation Links

- [Backend API Documentation (English)](backend/README.md) | [后端 API 文档 (中文)](backend/README.zh.md)
- [Contributing Guidelines (English)](CONTRIBUTING.md) | [贡献指南 (中文)](CONTRIBUTING.zh.md)
- [Development Roadmap](ROADMAP.md)

---

## License

[MIT License](LICENSE)
