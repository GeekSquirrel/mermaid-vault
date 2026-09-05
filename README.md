# Mermaid Live Editor with Node.js & SQLite Backend

[简体中文](README.zh.md) | English

This project extends the official [mermaid-live-editor](https://github.com/mermaid-js/mermaid-live-editor) with a robust, persistent **Node.js (Express + better-sqlite3)** backend. It enables seamless cloud-persisted storage, cross-device editing, diagram project management, and automated debounced synchronization.

---

## Architecture Overview

- **Frontend (`mermaid-vault-frontend/`)**: Built with SvelteKit and TypeScript (official upstream submodule). Features a "My Projects" dashboard, automatic 1.5s debounced synchronization to backend storage, editable project titles, and visual save status indicators.
- **Backend (`mermaid-vault-backend/`)**: Robust REST API powered by **Node.js (LTS)**, **Express**, and **`better-sqlite3`**. Includes automatic migration on startup, CORS headers, single-file SQLite database storage, and automated Vitest test suite.

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

- **Project Dashboard (`/dashboard`)**:
  - Collapsible workspace sidebar: create, rename, delete and switch workspaces;
    a built-in `Default` workspace receives unassigned projects.
  - View all saved Mermaid diagrams and flowcharts in SQLite.
  - Real-time client-side search by diagram title or code snippet (search box in the navbar).
  - Multi-select with select-all / batch delete; new projects belong to the
    workspace they were created from.
- **Server-Cached Diagram Previews**:
  - Project cards and bookmark cards load a cached preview SVG from the backend
    (light & dark themes stored separately, keyed by a SHA-256 hash of the code).
  - When the code has changed or no preview exists, the client falls back to live
    rendering and backfills the backend preview automatically.
- **Bookmark Cards with Previews**:
  - The Bookmarks panel renders entries as cards with diagram previews, plus the
    existing rename / restore / open / delete actions.
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
cd mermaid-vault-backend
pnpm install
pnpm dev
```
The backend API server starts at `http://localhost:8080`. On first run, it automatically initializes the SQLite database at `mermaid-vault-backend/data/mermaid.db`.

#### 2. Start the Frontend Live Editor
```bash
cd mermaid-vault-frontend
pnpm install
pnpm dev
```
The frontend editor starts at `http://localhost:3000` (or `:5173`).

Or start both from the repository root at once:
```bash
pnpm run dev
```

> **How it works**: In development the frontend always calls the relative path `/api`, and the Vite dev server proxies `/api/*` to the backend (default `http://localhost:8080`, override with `MERMAID_API_PROXY_TARGET`). Requests stay same-origin, so no CORS configuration is needed.

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
The editor will be accessible at `http://localhost` (or `http://<host-ip>` with `APP_FRONTEND_PORT`), so it works out of the box for LAN access. The frontend Nginx proxies `/api/*` to the backend container (`BACKEND_UPSTREAM`, default `http://backend:8080`) — no extra configuration is needed.

**Behind a reverse proxy**: point your Nginx/Caddy/Traefik at the frontend's exposed port and forward normally (e.g. `proxy_pass http://127.0.0.1:<APP_FRONTEND_PORT>;`). Everything is same-origin, so no CORS configuration is required on either side.

#### Development Mode (with Source Mount & Hot Reload)
```bash
docker compose -f docker-compose.dev.yml up
```

#### Pre-Built Images (GHCR)

Images are published to GitHub Container Registry (`ghcr.io`):

- **Frontend Image**: `ghcr.io/geeksquirrel/mermaid-vault-frontend`
- **Backend Image**: `ghcr.io/geeksquirrel/mermaid-vault-backend`

| Channel | Trigger | Tags | Platforms |
|---|---|---|---|
| **Dev** | Manual (**Actions** → **Publish Dev Docker Images to GHCR** → **Run workflow**) | `dev`, commit SHA, optional custom tag | `linux/amd64` by default; `linux/arm64` can be added via the `platforms` input |
| **Release** | Automatic, on pushing a `v*` tag (e.g. `v2.1.0`) | `X.Y.Z`, `X.Y`, `latest` | `linux/amd64`, `linux/arm64` |

To cut a release, push a version tag and the multi-arch images build automatically:

```bash
git tag v2.1.0
git push origin v2.1.0
```

---

## Deployment Modes & Configuration

You can easily select one of three deployment modes via the `API_BASE_URL` environment variable:

| Mode | `API_BASE_URL` Setting | Description |
|---|---|---|
| **1. Same-Origin Internal Proxy (Default)** | Leave empty / unset | Frontend uses relative path `/api`, proxied by frontend Nginx directly to backend container. No CORS required, single exposed port. |
| **2. Shared Domain / Gateway** | `API_BASE_URL=https://example.com/api` | Frontend directly requests this absolute URL, suitable for unified reverse proxy or gateway configurations. |
| **3. Standalone API Domain (CORS)** | `API_BASE_URL=https://api.example.com` | Frontend sends cross-origin requests to independent backend domain. Set `CORS_ORIGIN` on the backend to the frontend origin. Backend supports both `/api/projects` and `/projects`. |

---

## Environment Variables

Copy `.env.example` to `.env` or configure directly:

| Variable | Target | Default | Description |
|---|---|---|---|
| `APP_FRONTEND_PORT` | Frontend | `80` | Host port mapped to frontend container (replaces `FRONTEND_PORT`). |
| `API_BASE_URL` | Frontend | *(Empty)* | Runtime API base URL. Empty uses internal Nginx reverse proxy. |
| `BACKEND_UPSTREAM` | Frontend X Backend origin the frontend Nginx proxies `/api/` to. Change it when the backend is not in the same Docker compose network. |
| `PORT` | Backend | `8080` | Internal listening port inside the backend container. |
| `DB_PATH` | Backend | `/app/data/mermaid.db` | SQLite database file path. |
| `NODE_ENV` | Backend | `production` | Node.js execution environment. |
| `CORS_ORIGIN` | Backend *(Optional)* | `*` | Comma-separated origin whitelist, e.g. `https://example.com,https://app.example.com`. Only relevant for cross-origin API access (Mode 3). |
| `APP_BACKEND_PORT` | Backend *(Optional)* | *(Unset)* | Optional host port mapping for backend debugging (e.g. `8080`). |

`MERMAID_API_PROXY_TARGET` (dev only) overrides the Vite dev-proxy target for `/api`, defaulting to `http://localhost:8080` locally; the dev compose sets it to `http://backend:8080`.

Example `.env`:
```env
# Frontend Service Configuration
APP_FRONTEND_PORT=80
API_BASE_URL=
# Optional: override the backend origin used by the frontend Nginx proxy
# BACKEND_UPSTREAM=http://backend:8080

# Backend Configuration (Internal container settings)
PORT=8080
DB_PATH=/app/data/mermaid.db
NODE_ENV=production

# Optional: restrict cross-origin API access (comma-separated whitelist)
# CORS_ORIGIN=https://example.com

# Optional: Host port mapping for backend debugging
# APP_BACKEND_PORT=8080
```

---

## Documentation Links

- [Backend API Documentation (English)](mermaid-vault-backend/README.md) | [后端 API 文档 (中文)](mermaid-vault-backend/README.zh.md)
- [Contributing Guidelines (English)](CONTRIBUTING.md) | [贡献指南 (中文)](CONTRIBUTING.zh.md)
- [Development Roadmap](ROADMAP.md)

---

## License

[MIT License](LICENSE)
