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
docker build -t mermaid-editor-backend .

# 运行并挂载持久化数据目录
docker run -d \
  --name mermaid-editor-backend \
  -p 8080:8080 \
  -v $(pwd)/data:/app/data \
  mermaid-editor-backend
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

---

## 数据库表结构

定义位于 `migrations/001_init.sql`：

```sql
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,                  -- UUID v4
    title TEXT NOT NULL,                  -- 项目标题
    code TEXT NOT NULL,                   -- Mermaid 代码
    created_at INTEGER NOT NULL,          -- Unix 时间戳 (毫秒)
    updated_at INTEGER NOT NULL           -- Unix 时间戳 (毫秒)
);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);
```

