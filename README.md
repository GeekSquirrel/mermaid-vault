# Mermaid Live Editor with Node.js & SQLite Backend

[简体中文](README.zh.md) | English

[![CI](https://github.com/GeekSquirrel/mermaid-vault/actions/workflows/ci.yml/badge.svg)](https://github.com/GeekSquirrel/mermaid-vault/actions/workflows/ci.yml)

This project extends the official [mermaid-live-editor](https://github.com/mermaid-js/mermaid-live-editor) with a robust, persistent **Node.js (Express + better-sqlite3)** backend. It enables seamless cloud-persisted storage, cross-device editing, diagram management, and automated debounced synchronization.

---

## Architecture Overview

- **Frontend (`packages/mermaid-vault-frontend/`)**: Built with SvelteKit and TypeScript (official upstream submodule). Features a "My Diagrams" dashboard, automatic 1.5s debounced synchronization to backend storage, editable diagram titles, and visual save status indicators.
- **Backend (`packages/mermaid-vault-backend/`)**: Robust REST API powered by **Node.js (LTS)**, **Express**, and **`better-sqlite3`**. Includes automatic migration on startup, CORS headers, single-file SQLite database storage, and automated Vitest test suite.

```
+--------------------------+       HTTP REST API       +-------------------------+
|   Mermaid Live Editor    | <-----------------------> |   Node.js API Server    |
|   (Frontend :80/:8081)   |   (CORS / JSON DTOs)      |     (Backend :8080)     |
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

- **Diagram Dashboard (`/dashboard`)**:
  - Collapsible workspace sidebar: create, rename, delete and switch workspaces;
    a built-in `Default` workspace receives unassigned diagrams.
  - View all saved Mermaid diagrams and flowcharts in SQLite.
  - Real-time client-side search by diagram title or code snippet (search box in the navbar).
  - Multi-select with select-all / batch delete; new diagrams belong to the
    workspace they were created from.
- **Server-Cached Diagram Previews**:
  - Diagram cards and bookmark cards load a cached preview SVG from the backend
    (light & dark themes stored separately, keyed by a SHA-256 hash of the code).
  - When the code has changed or no preview exists, the client falls back to live
    rendering and backfills the backend preview automatically.
- **Bookmark Cards with Previews**:
  - The Bookmarks panel renders entries as cards with diagram previews, plus the
    existing rename / restore / open / delete actions.
- **Self-Hosted Share & Export Panel**:
  - The Share button opens a right-side panel (same layout as
    Bookmarks/Timeline) that merges the former Actions card: PNG/SVG export,
    Copy Image, Copy Markdown, Gist loading and embed snippets in one place.
  - Share-panel URLs (PNG/SVG/markdown thumbnails) point to the current page
    domain and are served by the backend rendering endpoints
    (`GET /api/render/svg/:state`, `GET /api/render/img/:state?type=png`) via
    headless Chromium — no external services like mermaid.ai / mermaid.ink /
    Kroki are involved.
- **Auto-Syncing Cloud Storage (`/diagram?id=xxx`)**:
  - Real-time debounced save (1.5s) on diagram code or title edits.
  - Save status indicators: *Saving...*, *Saved*, or *Save failed (Click to retry)*.
  - Dynamic URL synchronization without page reload.
- **Installable as a Desktop / Mobile App (PWA)**:
  - Ships a fixed web app manifest and an offline-capable service worker, so
    browsers offer "Install app" (Chrome/Edge address bar) and mobile
    "Add to Home Screen" — the app then launches in a standalone window like a
    native app.
  - Pages load network-first with a cached offline fallback, hashed build
    assets use stale-while-revalidate, and `/api` requests are never cached,
    so diagram data always stays fresh.
- **MCP Server for AI Agents**:
  - The backend wraps its REST API as Model Context Protocol tools (stdio +
    streamable HTTP at `/api/mcp`) so AI agents can save, organize, render and
    share diagrams on the user's behalf.
  - Ships with built-in agent usage instructions; see
    [docs/mcp.md](docs/mcp.md) ([简体中文](docs/mcp.zh.md)).
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
cd packages/mermaid-vault-backend
pnpm install
pnpm dev
```
The backend API server starts at `http://localhost:8080`. On first run, it automatically initializes the SQLite database at `packages/mermaid-vault-backend/data/mermaid.db`.

#### 2. Start the Frontend Live Editor
```bash
cd packages/mermaid-vault-frontend
pnpm install
pnpm dev
```
The frontend editor starts at `http://localhost:8081`.

Or start both from the repository root at once:
```bash
pnpm run dev
```

> **How it works**: In development the frontend always calls the relative path `/api`, and the Vite dev server proxies `/api/*` to the backend (default `http://localhost:8080`, override with `MERMAID_API_PROXY_TARGET`). Requests stay same-origin, so no CORS configuration is needed.

---

### Method 2: Docker Deployment

Mermaid Vault uses a unified single-container architecture for production: Express hosts both the REST API and the static SvelteKit frontend on a single port (default `8080`), eliminating cross-origin issues and reverse proxy overhead.

#### Production Mode (Single-Container Full-Stack)

```bash
# One-time: copy environment template
cp .env.example .env

# Start the unified container (Express + SvelteKit static build + SQLite)
docker compose up -d

# View service logs
docker compose logs -f
```

The editor is accessible at `http://localhost:8080` (or `http://<host-ip>:${PORT}`).

**Behind a reverse proxy**: point your Nginx/Caddy/Traefik at port 8080 (e.g. `proxy_pass http://127.0.0.1:8080;`). Since the frontend and API are served from the same origin, no CORS configuration is required.

#### Development Mode (with Source Mount & Hot Reload)

In development, the stack splits into separate hot-reloading containers (Vite dev server + Express backend with nodemon/tsx):

```bash
# Start development stack via pnpm script
pnpm dev

# Or directly with Docker Compose
docker compose -f docker-compose.dev.yml up -d

# View dev logs
pnpm dev:logs

# Stop dev stack
pnpm dev:down
```

The frontend Vite dev server runs at `http://localhost:8081` with hot module replacement (HMR), proxying `/api` requests to the backend container at `http://localhost:8080`. Because API calls stay same-origin (relative `/api` through the Vite proxy), other devices on your LAN can test the dev stack by opening `http://<host-ip>:8081` — no absolute API URL or CORS configuration is needed.

#### Testing in Docker

Run the full automated test suite inside an isolated container:

```bash
pnpm test
# Or: docker compose -f docker-compose.test.yml run --build --rm app-test
```

#### Monorepo Workflow Scripts (`package.json`)

| Command | Description |
|---|---|
| `pnpm dev` | Start development containers (`backend` + `frontend`) in background |
| `pnpm dev:logs` | Stream logs from development containers |
| `pnpm dev:down` | Stop development containers |
| `pnpm dev:rebuild` | Rebuild images, reset the dependency volumes, and restart the dev stack (use after changing dependencies) |
| `pnpm dev:reset` | Reset containers, rerun migrations, and restart dev stack |
| `pnpm migrate` | Run database migrations via one-off container |
| `pnpm test` | Run automated test suite inside Docker container |
| `pnpm build:image` | Build the single production Docker image (`mermaid-vault:local`) |
| `pnpm build:test` | Build the test target Docker image |
| `pnpm clean` | Stop containers and remove volumes |
| `pnpm clean:dev:port` | Read `.env` and automatically kill processes holding dev ports (8081, 8080, 9229, etc.) |
| `pnpm clean:dev:volumes` | Remove the named dependency volumes (`node_modules`, `.svelte-kit`) so the next start re-seeds them from the image |
| `pnpm shell:backend` | Open a shell inside the running backend container |
| `pnpm shell:frontend` | Open a shell inside the running frontend container |

#### Pre-Built Images (GHCR)

Unified multi-arch images are published to GitHub Container Registry (`ghcr.io`):
`ghcr.io/geeksquirrel/mermaid-vault:latest`

To run using the pre-built image, `docker-compose.yml` pulls directly from GHCR by default:

```bash
cp .env.example .env
docker compose pull
docker compose up -d
```

---

## Production Environment Variables & Configuration

In production, frontend and backend run unified in a single container (with Express serving both the REST API and the frontend SPA). Therefore, production deployments only require a single environment variable, **`BASE_URL`**:

| Variable | Scope | Default | Description |
|---|---|---|---|
| `BASE_URL` | Production container | *(Empty)* | Public base URL of the unified application (e.g. `https://mermaid.example.com` or `http://localhost:8080`). Used for generating MCP view/edit links and client runtime API routing. Defaults to browser same-origin relative `/api` when left empty. |
| `PORT` | Host port | `8080` | Port mapped to the host machine. |
| `TAG` | Image tag | `latest` | GHCR image tag. |

Development optional configurations (`docker-compose.dev.yml`):
| Variable | Scope | Default | Description |
|---|---|---|---|
| `FRONTEND_PORT` | Dev frontend | `8081` | Port mapped for the Vite dev server. |
| `BACKEND_PORT` | Dev backend | `8080` | Node.js Express backend port. |
| `DEBUG_PORT` | Debug port | `9229` | Node.js Inspector debug port. |

Example `.env`:
```env
PORT=8080
BASE_URL=https://mermaid.example.com
```

---

## Continuous Integration

The project uses GitHub Actions for CI. The [CI workflow](.github/workflows/ci.yml) runs automatically on every pull request, on every push to `main`, and on `v*` version tags (and can also be triggered manually from the *Actions* tab):

1. **Tests**: the backend suite runs through Docker Compose (`pnpm test`: frozen-lockfile install, `tsc` type-check, Vitest), and the frontend runs svelte-check type-checking plus its vitest unit suite (`pnpm run test:frontend`). Both run in Docker, exactly like local execution. Tests run on pull requests and version tags; a push to `main` skips them — its content was just validated by the merged PR's checks.
2. **Production image build**: the full single-container production image is built on every run, so frontend build or Dockerfile breakage is caught before merging. Before publishing, the image is smoke-tested in place: the container must boot, serve `/health`, serve the static frontend, and pass an API CRUD round-trip against real SQLite. Push events then publish it to GHCR (`ghcr.io/geeksquirrel/mermaid-vault`) with the following tags:

| Trigger | Image tags |
|---|---|
| Push to `main` | `<short-commit-sha>` (immutable) and `main` (rolling, always the newest commit) |
| Push a version tag (e.g. `v1.2.3`) | `v1.2.3`, `1.2.3` and `latest` (rolling, always the newest release) |

To deploy a specific build, set `TAG` in `.env` (e.g. `TAG=1.2.3`, `TAG=main` or a short commit SHA) and run `docker compose pull && docker compose up -d`.

---

## Documentation Links

- [Backend API Documentation (English)](packages/mermaid-vault-backend/README.md) | [后端 API 文档 (中文)](packages/mermaid-vault-backend/README.zh.md)
- [MCP Server — AI Agent Guide (English)](docs/mcp.md) | [MCP 服务器 — AI Agent 使用指南 (中文)](docs/mcp.zh.md)
- [Contributing Guidelines (English)](CONTRIBUTING.md) | [贡献指南 (中文)](CONTRIBUTING.zh.md)
- [Development Roadmap](ROADMAP.md)

---

## License

[MIT License](LICENSE)
