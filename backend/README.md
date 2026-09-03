# Mermaid Live Editor - Node.js & SQLite Backend

[简体中文](README.zh.md) | English

Persistent storage backend for Mermaid Live Editor, built with **Node.js**, **Express**, and **`better-sqlite3`**, providing lightweight, robust chart persistence across devices.

---

## Features

- **RESTful API**: Standard CRUD operations for Mermaid chart projects with Express.
- **Embedded SQLite Storage**: Automatic database migrations (`migrations/001_init.sql`), zero external database dependencies.
- **Cross-Origin Resource Sharing (CORS)**: Built-in support for preflight `OPTIONS` requests and configurable origins.
- **Strict Type Safety**: Fully typed with TypeScript strict mode and automated Vitest test suite.
- **Container Ready**: Multi-stage `Dockerfile` with health check and persistent volume.

---

## Environment Variables

Create a `.env` file in `backend/` or copy from `.env.example`:

```env
PORT=8080
DB_PATH=./data/mermaid.db
NODE_ENV=production
```

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8080` | HTTP port for the backend server |
| `DB_PATH` | `./data/mermaid.db` | Path to the SQLite database file |
| `NODE_ENV` | `development` / `production` | Environment mode |

---

## Quick Start

### Local Development

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Run in development mode (with watch)**:
   ```bash
   pnpm dev
   ```

3. **Build TypeScript for production**:
   ```bash
   pnpm build
   ```

4. **Start in production mode**:
   ```bash
   pnpm start
   ```

5. **Run test suite**:
   ```bash
   pnpm test
   ```


---

## Docker Deployment

### 1. Build and Run Standalone Container
```bash
# Build image
docker build -t mermaid-editor-backend .

# Run with persistent data volume
docker run -d \
  --name mermaid-editor-backend \
  -p 8080:8080 \
  -v $(pwd)/data:/app/data \
  mermaid-editor-backend
```

### 2. Run with Docker Compose
From the project root directory:
```bash
docker compose up -d
```

---

## API Documentation

Base URL: `http://localhost:8080`

### 1. Health Check
- **GET `/health`**
- **Response** `200 OK`:
  ```json
  {
    "status": "ok"
  }
  ```

### 2. List Projects
- **GET `/api/projects`**
- **Response** `200 OK`:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "c5accb93-f523-47ec-a450-15afb7c61e5b",
        "title": "Architecture Overview",
        "code": "graph TD\n  A --> B",
        "created_at": 1788324930518,
        "updated_at": 1788324930518
      }
    ]
  }
  ```

### 3. Get Project by ID
- **GET `/api/projects/:id`**
- **Response** `200 OK`:
  ```json
  {
    "success": true,
    "data": {
      "id": "c5accb93-f523-47ec-a450-15afb7c61e5b",
      "title": "Architecture Overview",
      "code": "graph TD\n  A --> B",
      "created_at": 1788324930518,
      "updated_at": 1788324930518
    }
  }
  ```
- **Response** `404 Not Found`:
  ```json
  {
    "success": false,
    "error": {
      "code": "NOT_FOUND",
      "message": "Project with id c5accb93-f523-47ec-a450-15afb7c61e5b not found"
    }
  }
  ```

### 4. Create Project
- **POST `/api/projects`**
- **Request Body**:
  ```json
  {
    "title": "Untitled Project",
    "code": "graph TD\n  Start --> Stop"
  }
  ```
- **Response** `201 Created`:
  ```json
  {
    "success": true,
    "data": {
      "id": "7bf3b0f5-0453-488b-a7e3-36358dbbbf30",
      "title": "Untitled Project",
      "code": "graph TD\n  Start --> Stop",
      "created_at": 1788324930518,
      "updated_at": 1788324930518
    }
  }
  ```

### 5. Update Project
- **PUT `/api/projects/:id`**
- **Request Body**:
  ```json
  {
    "title": "Updated Flowchart",
    "code": "graph LR\n  A --> B"
  }
  ```
- **Response** `200 OK`:
  ```json
  {
    "success": true,
    "data": {
      "id": "7bf3b0f5-0453-488b-a7e3-36358dbbbf30",
      "title": "Updated Flowchart",
      "code": "graph LR\n  A --> B",
      "created_at": 1788324930518,
      "updated_at": 1788324995000
    }
  }
  ```

### 6. Delete Project
- **DELETE `/api/projects/:id`**
- **Response** `200 OK`:
  ```json
  {
    "success": true,
    "data": {
      "deleted": true
    }
  }
  ```

### 7. List History Entries
- **GET `/api/history?type=manual&projectId=:projectId`**
  - `type` (optional): `manual` (default), `auto`, or `all`.
  - `projectId` (optional): Filter entries by project ID. Supports specific project UUID, `default` (unbound draft snapshots), or `all`.
- **Response** `200 OK`:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "8f8b3c63-455b-4357-96a8-f99a8ea8d88e",
        "project_id": "c5accb93-f523-47ec-a450-15afb7c61e5b",
        "name": "Architecture Snapshot",
        "state": {
          "code": "graph TD\n  A --> B",
          "mermaid": "{}",
          "updateDiagram": true
        },
        "time": 1788325000000,
        "type": "manual"
      }
    ]
  }
  ```

### 8. Create History Snapshot
- **POST `/api/history`**
- **Request Body**:
  ```json
  {
    "projectId": "c5accb93-f523-47ec-a450-15afb7c61e5b",
    "name": "Architecture Snapshot",
    "state": {
      "code": "graph TD\n  A --> B",
      "mermaid": "{}"
    },
    "type": "manual"
  }
  ```
- **Response** `201 Created`:
  ```json
  {
    "success": true,
    "data": {
      "id": "8f8b3c63-455b-4357-96a8-f99a8ea8d88e",
      "name": "Architecture Snapshot",
      "state": { ... },
      "time": 1788325000000,
      "type": "manual"
    }
  }
  ```

### 9. Update / Rename History Entry
- **PUT `/api/history/:id`**
- **Request Body**:
  ```json
  {
    "name": "Updated Snapshot Name"
  }
  ```
- **Response** `200 OK`

### 10. Delete History Entry
- **DELETE `/api/history/:id`**
- **Response** `200 OK`

### 11. Clear History Entries
- **DELETE `/api/history?type=manual`**
- **Response** `200 OK`

---

## Database Schema

Defined in `migrations/001_init.sql` and `migrations/002_history.sql`:

```sql
-- 1. Projects table
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,                  -- UUID v4
    title TEXT NOT NULL,                  -- Project title
    code TEXT NOT NULL,                   -- Mermaid diagram code
    created_at INTEGER NOT NULL,          -- Unix timestamp in ms
    updated_at INTEGER NOT NULL           -- Unix timestamp in ms
);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);

-- 2. History snapshot entries (cross-device synchronization)
CREATE TABLE IF NOT EXISTS history_entries (
    id TEXT PRIMARY KEY,                  -- UUID v4
    name TEXT NOT NULL,                   -- Entry name / title
    state TEXT NOT NULL,                  -- Mermaid complete state JSON string
    time INTEGER NOT NULL,                -- Unix timestamp in ms
    type TEXT NOT NULL DEFAULT 'manual'   -- Type ('manual' / 'auto')
);
CREATE INDEX IF NOT EXISTS idx_history_entries_time ON history_entries(time DESC);
```
