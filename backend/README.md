# Mermaid Live Editor - Bun & SQLite Backend

Mermaid Live Editor 的持久化后端服务，基于 **Bun.js** 与内置的 **SQLite (`bun:sqlite`)** 构建，提供轻量、高效的图表项目云端存储服务。

---

## 功能特性

- **RESTful API**：标准的项目 CRUD 操作。
- **SQLite 存储**：自动数据库迁移 (`migrations/001_init.sql`)，单文件无须额外部署数据库服务。
- **跨域支持 (CORS)**：原生配置预检请求 (OPTIONS) 及响应头，支持前端开箱即用。
- **内置类型安全**：TypeScript 严格模式。

---

## 环境变量

创建 `.env` 文件（或参考 `.env.example`）：

```env
PORT=8080
DB_PATH=./data/mermaid.db
```

- `PORT`: 服务监听端口（默认 `8080`）
- `DB_PATH`: SQLite 数据库存储文件路径（默认 `./data/mermaid.db`）

---

## 启动指南

### 依赖安装
```bash
bun install
```

### 开发模式（热重载）
```bash
bun run dev
```

### 生产启动
```bash
bun run start
```

---

## API 接口文档

基准路径: `http://localhost:8080`

### 1. 健康检查
- **GET `/health`**
- **响应**：`{ "status": "ok" }`

### 2. 获取项目列表
- **GET `/api/projects`**
- **响应**：
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "c5accb93-f523-47ec-a450-15afb7c61e5b",
        "title": "流程图项目",
        "code": "graph TD\n  A --> B",
        "created_at": 1788324930518,
        "updated_at": 1788324930518
      }
    ]
  }
  ```

### 3. 获取单个项目
- **GET `/api/projects/:id`**
- **响应**：`{ "success": true, "data": { ... } }`
- **错误**（404）：`{ "success": false, "error": { "code": "NOT_FOUND", "message": "Project with id xxx not found" } }`

### 4. 创建项目
- **POST `/api/projects`**
- **请求体**：
  ```json
  {
    "title": "未命名项目",
    "code": "graph TD\n  Start --> Stop"
  }
  ```
- **响应**（201）：`{ "success": true, "data": { "id": "...", "title": "...", ... } }`

### 5. 更新项目
- **PUT `/api/projects/:id`**
- **请求体**：
  ```json
  {
    "title": "新标题",
    "code": "graph LR\n  A --> B"
  }
  ```
- **响应**（200）：`{ "success": true, "data": { ... } }`

### 6. 删除项目
- **DELETE `/api/projects/:id`**
- **响应**（200）：`{ "success": true, "data": { "deleted": true } }`

---

## 数据库架构

数据表 `projects` 定义位于 `migrations/001_init.sql`：

```sql
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,                  -- UUID v4
    title TEXT NOT NULL,                  -- 项目标题
    code TEXT NOT NULL,                   -- Mermaid 代码内容
    created_at INTEGER NOT NULL,          -- Unix 时间戳 (毫秒)
    updated_at INTEGER NOT NULL           -- Unix 时间戳 (毫秒)
);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);
```
