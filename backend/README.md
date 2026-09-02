# Mermaid Live Editor - Bun & SQLite Backend

[简体中文](README.zh.md) | English

Persistent storage backend for Mermaid Live Editor, built with **Bun.js** and native **SQLite (`bun:sqlite`)**, providing lightweight, ultra-fast chart persistence across devices.

---

## Features

- **RESTful API**: Standard CRUD operations for Mermaid chart projects.
- **Embedded SQLite Storage**: Automatic database migrations (`migrations/001_init.sql`), zero external database dependencies.
- **Cross-Origin Resource Sharing (CORS)**: Built-in support for preflight `OPTIONS` requests and configurable origins.
- **Strict Type Safety**: Fully typed with TypeScript strict mode.
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
   bun install
   ```

2. **Run in development mode (with watch)**:
   ```bash
   bun run dev
   ```

3. **Start in production mode**:
   ```bash
   bun run start
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

---

## Database Schema

Defined in `migrations/001_init.sql`:

```sql
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,                  -- UUID v4
    title TEXT NOT NULL,                  -- Project title
    code TEXT NOT NULL,                   -- Mermaid diagram code
    created_at INTEGER NOT NULL,          -- Unix timestamp in ms
    updated_at INTEGER NOT NULL           -- Unix timestamp in ms
);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);
```
