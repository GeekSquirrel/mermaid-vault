# Mermaid Live Editor - Node.js & SQLite 后端服务

[English](README.md) | 简体中文

Mermaid Live Editor 的持久化存储后端服务，基于 **Node.js**、**Express** 与 **`better-sqlite3`** 构建，提供轻量、稳健的图表持久化与多端同步能力。

---

## 功能特性

- **RESTful API**：基于 Express 的标准 Mermaid 图表项目增删改查 (CRUD) 接口。
- **内置 SQLite 存储**：全自动数据库迁移与表初始化 (`migrations/001_init.sql`)，单文件零额外数据库依赖。
- **跨域资源共享 (CORS)**：原生支持预检 `OPTIONS` 请求及自定义跨域来源。
- **严格类型安全**：基于 TypeScript 严格模式 (`strict: true`)，并配备完整的 Vitest 自动化测试套件。
- **生产级容器化**：多阶段构建的 `Dockerfile`，内置健康检查 (`HEALTHCHECK`) 与数据卷持久化。

---

## 环境变量配置

在 `backend/` 下创建 `.env` 文件（或参考 `.env.example`）：

```env
PORT=8080
DB_PATH=./data/mermaid.db
NODE_ENV=production
```

| 变量名 | 默认值 | 说明 |
|---|---|---|
| `PORT` | `8080` | 后端服务 HTTP 监听端口 |
| `DB_PATH` | `./data/mermaid.db` | SQLite 数据库文件存储路径 |
| `NODE_ENV` | `development` / `production` | 运行环境模式 |

---

## 快速开始

### 本地开发

1. **安装依赖**：
   ```bash
   pnpm install
   ```

2. **开发模式启动（支持热重载）**：
   ```bash
   pnpm dev
   ```

3. **构建生产版本**：
   ```bash
   pnpm build
   ```

4. **生产模式启动**：
   ```bash
   pnpm start
   ```

5. **执行测试套件**：
   ```bash
   pnpm test
   ```


---

## Docker 部署

### 1. 构建与运行独立容器
```bash
# 构建镜像
docker build -t mermaid-vault-backend .

# 运行并挂载持久化数据目录
docker run -d \
  --name mermaid-vault-backend \
  -p 8080:8080 \
  -v $(pwd)/data:/app/data \
  mermaid-vault-backend
```

### 2. 使用 Docker Compose 一键启动
在项目根目录下执行：
```bash
docker compose up -d
```

---

## API 接口文档

基础路径：`http://localhost:8080`

### 1. 服务健康检查
- **GET `/health`**
- **响应** `200 OK`：
  ```json
  {
    "status": "ok"
  }
  ```

### 2. 获取项目列表
- **GET `/api/projects`**
- **响应** `200 OK`：
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "c5accb93-f523-47ec-a450-15afb7c61e5b",
        "title": "架构设计图",
        "code": "graph TD\n  A --> B",
        "created_at": 1788324930518,
        "updated_at": 1788324930518
      }
    ]
  }
  ```

### 3. 获取单个项目
- **GET `/api/projects/:id`**
- **响应** `200 OK`：
  ```json
  {
    "success": true,
    "data": {
      "id": "c5accb93-f523-47ec-a450-15afb7c61e5b",
      "title": "架构设计图",
      "code": "graph TD\n  A --> B",
      "created_at": 1788324930518,
      "updated_at": 1788324930518
    }
  }
  ```
- **响应** `404 Not Found`：
  ```json
  {
    "success": false,
    "error": {
      "code": "NOT_FOUND",
      "message": "Project with id c5accb93-f523-47ec-a450-15afb7c61e5b not found"
    }
  }
  ```

### 4. 创建新项目
- **POST `/api/projects`**
- **请求体**：
  ```json
  {
    "title": "Untitled Project",
    "code": "graph TD\n  Start --> Stop"
  }
  ```
- **响应** `201 Created`：
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

### 5. 更新项目
- **PUT `/api/projects/:id`**
- **请求体**：
  ```json
  {
    "title": "更新后的流程图",
    "code": "graph LR\n  A --> B"
  }
  ```
- **响应** `200 OK`：
  ```json
  {
    "success": true,
    "data": {
      "id": "7bf3b0f5-0453-488b-a7e3-36358dbbbf30",
      "title": "更新后的流程图",
      "code": "graph LR\n  A --> B",
      "created_at": 1788324930518,
      "updated_at": 1788324995000
    }
  }
  ```

### 6. 删除项目
- **DELETE `/api/projects/:id`**
- **响应** `200 OK`：
  ```json
  {
    "success": true,
    "data": {
      "deleted": true
    }
  }
  ```

### 7. 获取历史记录列表
- **GET `/api/history?type=manual&projectId=:projectId`**
  - `type`（可选）：`manual`（默认）或 `auto` 或 `all`。
  - `projectId`（可选）：指定项目 ID 过滤。支持特定项目 UUID、`default`（未绑定项目的草稿快照）或 `all`。
- **响应** `200 OK`：
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "8f8b3c63-455b-4357-96a8-f99a8ea8d88e",
        "project_id": "c5accb93-f523-47ec-a450-15afb7c61e5b",
        "name": "架构设计图快照",
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

### 8. 创建历史快照
- **POST `/api/history`**
- **请求体**：
  ```json
  {
    "projectId": "c5accb93-f523-47ec-a450-15afb7c61e5b",
    "name": "架构设计图快照",
    "state": {
      "code": "graph TD\n  A --> B",
      "mermaid": "{}"
    },
    "type": "manual"
  }
  ```
- **响应** `201 Created`：
  ```json
  {
    "success": true,
    "data": {
      "id": "8f8b3c63-455b-4357-96a8-f99a8ea8d88e",
      "name": "架构设计图快照",
      "state": { ... },
      "time": 1788325000000,
      "type": "manual"
    }
  }
  ```

### 9. 获取已存图表预览
- **GET `/api/projects/:id/preview.svg?theme=light|dark`**
- **GET `/api/history/:id/preview.svg?theme=light|dark`**
- 返回项目或历史（书签）条目在指定配色主题下缓存的预览 SVG。
- 仅当存储的预览是由该资源**当前**代码渲染而来时才会返回（通过代码的 SHA-256 哈希校验）。
  当代码已变更（或尚无预览）时返回 `404 Not Found`，客户端可据此回退到前端实时渲染，
  并上传新的预览。
- **响应** `200 OK`：`Content-Type: image/svg+xml`，`ETag: "<代码 sha256>"`，
  `Cache-Control: no-cache`（条件请求返回 `304 Not Modified`）。
- **响应** `404 Not Found`：标准错误结构（`error.code: "NOT_FOUND"`）。

### 10. 上传图表预览
- **PUT `/api/projects/:id/preview`**
- **PUT `/api/history/:id/preview`**
- 存储由客户端渲染的预览 SVG。`codeHash` 必须与该资源当前代码的 SHA-256 哈希一致，
  否则拒绝写入并返回 `409 Conflict`（渲染结果已过期）。
- **请求体**：
  ```json
  {
    "theme": "light",
    "codeHash": "9f2b…图表代码的 64 位 sha256 十六进制串…",
    "svg": "<svg …>…</svg>"
  }
  ```
- **响应** `200 OK`：
  ```json
  {
    "success": true,
    "data": { "saved": true }
  }
  ```

### 11. 更新/重命名历史记录
- **PUT `/api/history/:id`**
- **请求体**：
  ```json
  {
    "name": "新快照名称"
  }
  ```
- **响应** `200 OK`

### 12. 删除单个历史记录
- **DELETE `/api/history/:id`**
- **响应** `200 OK`

### 14. 工作区（Workspaces）
所有工作区都是等价的——不存在特权的默认工作区。首次初始化时会自动创建一个示例工作区
（Sample Workspace），它可以像其他工作区一样被重命名或删除。每个项目始终属于某个已存在的
工作区：删除工作区时，其项目会移动到剩余工作区中最早创建的一个；当删除最后一个工作区时，
若其中仍有项目，会自动创建一个新工作区接管这些项目（若没有项目则工作区列表直接为空）。

- **GET `/api/workspaces`** — 获取工作区列表
- **GET `/api/workspaces/:id`** — 获取单个工作区
- **POST `/api/workspaces`** — 创建工作区
  - 请求体：`{ "name": "Engineering" }`
- **PUT `/api/workspaces/:id`** — 重命名工作区
  - 请求体：`{ "name": "Design" }`
- **DELETE `/api/workspaces/:id`** — 删除工作区（其项目移动到最早的剩余工作区）
- **响应** `200 OK`：
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "default",
        "name": "Default",
        "created_at": 1788564470000,
        "updated_at": 1788564470000
      }
    ]
  }
  ```

`POST /api/projects` 与 `PUT /api/projects/:id` 接受可选的 `workspace_id` 字段，用于将项目
归属到指定工作区。未知或缺失的工作区 id 会回退到最早的剩余工作区，确保项目总是归属到
某个已存在的工作区。

---

## 数据库表结构

定义位于 `migrations/001_init.sql`、`migrations/002_history.sql` 与 `migrations/003_workspaces.sql`：

```sql
-- 1. 项目主表
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,                  -- UUID v4
    title TEXT NOT NULL,                  -- 项目标题
    code TEXT NOT NULL,                   -- Mermaid 代码
    workspace_id TEXT REFERENCES workspaces(id), -- 所属工作区 (始终有值)
    created_at INTEGER NOT NULL,          -- Unix 时间戳 (毫秒)
    updated_at INTEGER NOT NULL           -- Unix 时间戳 (毫秒)
);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);

-- 2. 历史保存快照表 (支持跨端同步)
CREATE TABLE IF NOT EXISTS history_entries (
    id TEXT PRIMARY KEY,                  -- UUID v4
    name TEXT NOT NULL,                   -- 条目名称/标题
    state TEXT NOT NULL,                  -- Mermaid 完整状态 JSON 字符串
    time INTEGER NOT NULL,                -- Unix 时间戳 (毫秒)
    type TEXT NOT NULL DEFAULT 'manual'   -- 类型 ('manual' / 'auto')
);
CREATE INDEX IF NOT EXISTS idx_history_entries_time ON history_entries(time DESC);

-- 3. 工作区表 (用户自定义的项目分组；首次初始化时创建示例工作区)
CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,                  -- UUID v4
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL,          -- Unix 时间戳 (毫秒)
    updated_at INTEGER NOT NULL           -- Unix 时间戳 (毫秒)
);
```

预览缓存列在启动时以幂等方式添加到两张表中（见 `src/db/index.ts`）：
`preview_light_svg`、`preview_light_hash`、`preview_dark_svg`、`preview_dark_hash`（TEXT）与
`preview_updated_at`（INTEGER）。每个 `preview_*_hash` 记录渲染该 SVG 所用图表代码的
SHA-256 哈希；只有哈希与当前存储代码一致时，预览才被视为最新。
`projects.workspace_id` 列同样在启动时以幂等方式添加；没有归属工作区的项目会被分配到
最早的已存在工作区。

