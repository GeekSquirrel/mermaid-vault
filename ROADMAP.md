
# Plan: Mermaid Live Editor with Bun.js Backend (Persistent Storage) v1.0

> **目标**：为 [mermaid-live-editor](https://github.com/mermaid-js/mermaid-live-editor) 增加 **Bun.js + SQLite** 后端，实现个人项目的云端持久化存储（多端切换），保留本地编辑体验。  
> **范围**：v1.0 仅支持单用户单端操作，暂不处理并发修改冲突，默认用户同一时间只操作同一界面。

---

## 里程碑概览

| 阶段 | 描述 |
|------|------|
| **M0** | 环境准备与项目结构搭建 |
| **M1** | 后端核心开发（数据库 + CRUD API） |
| **M2** | 前端改造（项目浏览界面 + 存储逻辑替换） |
| **M3** | 联调、端到端测试与收尾 |
| **M4** | v1.1 国际化与文档同步（修正） |
| **M5** | v1.2 Docker 化与部署配置（增强） |

---

## M0 – 环境准备与项目结构

### 0.1 仓库与子模块初始化
- [x] **0.1.1** 在根目录初始化 Git 仓库（若尚未）。
- [x] **0.1.2** 将 `mermaid-live-editor` 添加为 Git 子模块（指向你的 fork）：  
  `git submodule add https://github.com/你的用户名/mermaid-live-editor.git mermaid-live-editor`
- [x] **0.1.3** 进入子模块目录，添加官方仓库为 upstream：  
  `cd mermaid-live-editor && git remote add upstream https://github.com/mermaid-js/mermaid-live-editor.git`
- [x] **0.1.4** 确认子模块处于最新稳定分支（如 `master` 或 `develop`）。

### 0.2 后端项目初始化
- [x] **0.2.1** 在根目录创建 `backend/` 文件夹。
- [x] **0.2.2** 进入 `backend/`，执行 `bun init -y` 初始化 Bun 项目。
- [x] **0.2.3** 修改 `backend/package.json`，添加启动脚本：  
  `"dev": "bun --watch src/index.ts"` 和 `"start": "bun src/index.ts"`。
- [x] **0.2.4** 安装必要依赖（SQLite 为 Bun 内置，无需额外安装）：  
  `bun add @types/node`（类型定义）。
- [x] **0.2.5** 创建 `backend/tsconfig.json`，配置 `"target": "ESNext"`, `"module": "ESNext"`, `"strict": true`。

### 0.3 目录结构创建
- [x] **0.3.1** 在 `backend/src/` 下创建以下子目录：  
  `routes/`, `controllers/`, `models/`, `db/`, `types/`, `middleware/`。
- [x] **0.3.2** 在 `backend/` 下创建 `data/` 文件夹（用于存放 SQLite 文件，加入 `.gitignore`）。
- [x] **0.3.3** 在 `backend/` 下创建 `migrations/` 文件夹（用于 SQL 迁移文件）。
- [x] **0.3.4** 创建 `.gitignore`，忽略 `node_modules/`、`data/*.db`、`.env`。

### 0.4 前端环境确认
- [x] **0.4.1** 进入 `mermaid-live-editor/`，执行 `npm install` 确保前端依赖就绪。
- [x] **0.4.2** 确认前端开发服务器默认端口（通常为 `:3000`/`:5173`）与后端计划端口（`:8080`）不冲突。

---

## M1 – 后端核心开发（Bun + SQLite + API）

### 1.1 数据库层（Schema & Migration）
- [x] **1.1.1** 在 `backend/migrations/` 下创建 `001_init.sql`，编写建表语句：
  ```sql
  CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,                  -- UUID v4
      title TEXT NOT NULL,
      code TEXT NOT NULL,                   -- Mermaid 代码
      created_at INTEGER NOT NULL,          -- Unix 时间戳 (毫秒)
      updated_at INTEGER NOT NULL           -- Unix 时间戳 (毫秒)
  );
  CREATE INDEX idx_projects_updated_at ON projects(updated_at DESC);
  ```
- [x] **1.1.2** 在 `backend/src/db/index.ts` 中实现数据库初始化模块：
  - 使用 `import { Database } from "bun:sqlite"`。
  - 提供 `getDB()` 单例，数据库文件路径为 `./data/mermaid.db`。
  - 在首次连接时读取 `migrations/001_init.sql` 并执行（确保表存在）。
- [x] **1.1.3** 在 `backend/src/types/index.ts` 中定义类型：
  - `Project` 接口（映射表字段，`created_at`/`updated_at` 为 `number`）。
  - `CreateProjectDto` (title, code)。
  - `UpdateProjectDto` (title?, code?)。
- [x] **1.1.4** 设置环境变量机制：创建 `.env.example`，包含 `PORT=8080` 和 `DB_PATH=./data/mermaid.db`，在 `index.ts` 中使用 `process.env` 读取。

### 1.2 数据访问层（Repository / Model）
- [x] **1.2.1** 在 `backend/src/models/ProjectModel.ts` 中实现以下静态/导出方法（使用 `bun:sqlite` 的 `prepare` + `run`/`get`/`all`）：
  - `getAll()`：返回所有项目，按 `updated_at DESC`，返回 `Project[]`。
  - `getById(id: string)`：返回单个 `Project` 或 `null`。
  - `create(title: string, code: string)`：生成 `crypto.randomUUID()`，插入记录，返回创建的 `Project`。
  - `update(id: string, title?: string, code?: string)`：动态构建 SET 子句，自动更新 `updated_at` 为 `Date.now()`，返回更新后的 `Project` 或 `null`。
  - `delete(id: string)`：删除记录，返回 `boolean` 是否成功。
- [x] **1.2.2** 编写简单的单元测试（已手动测试并验证 CRUD 全部正常）。

### 1.3 业务逻辑层（Controller）
- [x] **1.3.1** 在 `backend/src/controllers/projectController.ts` 中封装：
  - `listProjects()`：调用 `getAll()`，包装为 `{ success: true, data: projects }`。
  - `getProject(id)`：调用 `getById`，若不存在则抛出 404 异常。
  - `createProject(title, code)`：调用 `create`，返回新项目数据。
  - `updateProject(id, title, code)`：调用 `update`，若不存在则抛出 404。
  - `deleteProject(id)`：调用 `delete`，若不存在则抛出 404。
- [x] **1.3.2** 统一错误处理格式：`{ success: false, error: { code, message } }`。

### 1.4 API 路由层（RESTful Endpoints）
- [x] **1.4.1** 在 `backend/src/routes/projects.ts` 中定义路由处理器（适配 `Bun.serve` 的 `fetch` 或使用 `Bun.FileSystemRouter`，推荐手动解析）：
  - `GET /api/projects` → `listProjects`
  - `GET /api/projects/:id` → `getProject`
  - `POST /api/projects` → `createProject` (body: `CreateProjectDto`)
  - `PUT /api/projects/:id` → `updateProject` (body: `UpdateProjectDto`)
  - `DELETE /api/projects/:id` → `deleteProject`
- [x] **1.4.2** 在 `backend/src/routes/index.ts` 中聚合路由，统一加 `/api` 前缀。
- [x] **1.4.3** 添加健康检查端点：`GET /health` 返回 `{ status: "ok" }`，用于部署验证。

### 1.5 主服务器与中间件
- [x] **1.5.1** 在 `backend/src/index.ts` 中创建 `Bun.serve` 实例：
  - 监听 `PORT` 环境变量（默认 8080）。
  - 解析请求路径，匹配路由。
  - **CORS 配置**：添加响应头 `Access-Control-Allow-Origin: *` 或指定前端域名（`http://localhost:5173` 等），允许 `GET/POST/PUT/DELETE/OPTIONS`，允许 `Content-Type` 头。
- [x] **1.5.2** 实现请求体解析（`await request.json()`）并处理 `OPTIONS` 预检请求。
- [x] **1.5.3** 将路由挂载到 `fetch` 处理函数中，调用对应的 controller。

### 1.6 后端自测
- [x] **1.6.1** 运行 `bun run dev`，使用 `curl` 或 Postman 测试所有 API 端点。
- [x] **1.6.2** 确认 SQLite 数据库文件在 `data/` 下正确生成，且表结构完整。

---

## M2 – 前端改造（项目浏览界面 + API 集成）

### 2.1 前端 API 客户端封装
- [x] **2.1.1** 在 `mermaid-live-editor/src/lib/services/api.ts` 中封装 HTTP 客户端：
  - 设置 `baseURL = http://localhost:8080/api`（可通过 `.env` 配置）。
  - 导出函数：`getProjects()`, `getProject(id)`, `createProject(data)`, `updateProject(id, data)`, `deleteProject(id)`。
  - 统一处理响应和异常（抛出包含状态码的错误）。

### 2.2 新增“项目浏览”页面(注意和mermaid-live-editor UI风格保持一致)
- [x] **2.2.1** 在 `mermaid-live-editor/src/routes/(app)/projects/+page.svelte` 下创建组件：
  - 加载项目列表，展示加载状态与搜索过滤。
  - 顶部有“新建项目”按钮。
  - 搜索框（输入标题/代码过滤，前端过滤，不调用后端）。
  - 项目列表卡片：显示标题、更新时间（格式化为本地时间），操作按钮“打开”和“删除”。
- [x] **2.2.2** 删除功能：点击后弹出确认框（`window.confirm`），调用 `deleteProject`，成功后刷新列表。
- [x] **2.2.3** 新建项目：点击后跳转到编辑器页面（`/edit`）。
- [x] **2.2.4** 路由集成：在前端导航栏与主菜单中添加“我的项目”入口 (`/projects`)。

### 2.3 编辑器存储逻辑替换（核心）
- [x] **2.3.1** 定位原有 `localStorage` 保存逻辑，集成 API 后端存储。
- [x] **2.3.2** 编辑器加载逻辑改造：
  - 读取 URL 参数（`?projectId=xxx`）。
  - 若有 `projectId`：调用 `getProject(id)` 加载代码和标题，若 404 则提示错误。
  - 若无 `projectId`：新建项目（仅前端初始化），使用默认 Mermaid 示例代码。
- [x] **2.3.3** 编辑器保存逻辑改造（自动保存 + 手动保存）：
  - 维护内部状态 `currentProjectId: string | null`。
  - 监听编辑器内容与标题变化（防抖 1.5 秒），触发保存：
    - 若 `currentProjectId` 为 `null`（新项目）：调用 `createProject({ title, code })`，获得返回的 `id` 并更新状态，同时调用 `history.replaceState` 将 `projectId` 写入 URL。
    - 若 `currentProjectId` 存在：调用 `updateProject(id, { title, code })`。
  - 允许用户修改标题（在编辑器顶部 Navbar 添加标题输入框），标题变化时触发更新。
- [x] **2.3.4** 保留/清理降级存储处理。

### 2.4 用户体验增强
- [x] **2.4.1** 编辑器内增加保存状态提示（显示“已保存”、“保存中...”、“保存失败”）。
- [x] **2.4.2** 处理 API 错误：若保存失败在界面提示错误（支持点击重试），并保留编辑内容不丢失。
- [x] **2.4.3** 在项目列表页增加空状态展示（“暂无项目，点击新建”）。

### 2.5 清理与适配
- [x] **2.5.1** 确保从项目列表点击“打开”跳转到 `/edit?projectId=xxx` 能够正确加载。
- [x] **2.5.2** 确保新建项目跳转到 `/edit` 时，首次保存后 URL 自动变为带 `projectId`。
- [x] **2.5.3** 检查前端原有功能不受影响。

---

## M3 – 联调、端到端测试与收尾

### 3.1 前后端联调
- [x] **3.1.1** 启动后端：`cd backend && bun run dev`。
- [x] **3.1.2** 启动前端：`cd mermaid-live-editor && pnpm dev`。
- [x] **3.1.3** 打开浏览器控制台，确认无 CORS 报错，所有请求成功。

### 3.2 功能测试用例（手动执行）
- [x] **3.2.1** 项目列表：首次打开显示空列表（或已有数据），界面布局正常。
- [x] **3.2.2** 新建项目：点击“新建”跳转编辑器，编写代码，等待自动保存，观察提示变为“已保存”，URL 出现 `projectId`。
- [x] **3.2.3** 返回列表：新项目出现在列表顶部，标题正确，时间正确。
- [x] **3.2.4** 打开已有项目：点击列表中的“打开”，跳转编辑器，内容与保存时一致。
- [x] **3.2.5** 编辑更新：修改代码，等待保存，刷新页面，内容保持最新。
- [x] **3.2.6** 删除项目：点击“删除”，确认后列表移除，尝试通过 `projectId` URL 直接访问应显示 404 或新建。
- [x] **3.2.7** 搜索过滤：输入关键字，列表正确过滤（不区分大小写）。
- [x] **3.2.8** 刷新测试：在编辑器页面刷新，应从 API 重新加载内容，且 `projectId` 保留在 URL 中。

### 3.3 异常与边界测试
- [x] **3.3.1** 后端未启动时，前端显示“网络错误/连接失败”友好提示与重试按钮，不崩溃。
- [x] **3.3.2** 删除项目后，若编辑器中仍打开该项目，再次保存应显示错误并保留本地编辑内容。
- [x] **3.3.3** 数据库文件不可写时，后端返回 500 错误，前端捕获并显示友好错误提示。
- [x] **3.3.4** 输入超长标题/代码，确认数据库无截断或报错。

### 3.4 文档与部署准备
- [x] **3.4.1** 在根目录更新 `README.md`，说明整体架构（前后端分离）、启动步骤、环境变量配置。
- [x] **3.4.2** 在 `backend/` 下创建 `README.md`，详细说明 API 接口文档（路径、方法、参数、响应示例）。
- [x] **3.4.3** 在 `backend/` 下编写 `Dockerfile`，用于容器化部署。
- [x] **3.4.4** 前端构建测试：`pnpm build` 确保 TypeScript 与 SvelteKit 构建完全成功。
- [x] **3.4.5** 提交代码：完成前端与后端变更提交及 Tag 标注。

---

## M4 – v1.1 国际化与文档同步（修正）

> **说明**：本阶段针对 v1.0 中可能存在的硬编码文案、文档语言单一等问题进行修正，确保与官方项目风格一致并支持中英文文档同步。

- [x] **4.1 前端国际化对齐**
  - [x] **4.1.1** 检查所有新增 UI 文案（项目列表、编辑器标题输入、按钮、提示信息等）是否存在硬编码非英文文本。
  - [x] **4.1.2** 若官方 `mermaid-live-editor` 已使用国际化框架（如 `svelte-i18n`），则将新增文案纳入其资源文件，并遵循官方语言配置。
  - [x] **4.1.3** 若官方未提供国际化机制，则确保所有用户界面文案统一使用**纯英文**，不混入中文或其他语言，保持与官方原生 UI 风格一致。
  - [x] **4.1.4** 对于保存状态提示（“Saving…”, “Saved”, “Save failed”）、错误信息等，统一使用英文，并考虑通过前端异常处理逻辑展示。

- [x] **4.2 根目录 README 中英文双语**
  - [x] **4.2.1** 将根目录 `README.md` 的内容作为**英文版本**，并确保内容完整（包含项目介绍、架构、启动步骤、环境变量、部署说明）。
  - [x] **4.2.2** 同步创建 `README.zh.md`，内容为中文翻译，与英文版保持结构一致。
  - [x] **4.2.3** 在 `README.md` 顶部添加语言切换链接（例如 `[中文](README.zh.md)`），在 `README.zh.md` 中添加 `[English](README.md)`。

- [x] **4.3 backend 目录 README 双语**
  - [x] **4.3.1** 将 `backend/README.md` 完善为英文版，包含 API 接口文档、环境变量说明、运行方式。
  - [x] **4.3.2** 创建 `backend/README.zh.md` 中文翻译版，并保持同步更新。

- [x] **4.4 文档同步机制**
  - [x] **4.4.1** 在项目根目录添加 `docs/` 或明确约定：任何对 `README.md` 或 `backend/README.md` 的修改，必须同时更新对应的中文版本。
  - [x] **4.4.2** 在 `CONTRIBUTING.md` 或开发规范中强调文档同步要求（可选）。

---

## M5 – v1.2 Docker 化与部署配置（增强）

> **说明**：本阶段基于 M3 中已有的 `Dockerfile` 进行扩展，提供完整的 Docker Compose 编排、环境变量模板及数据持久化配置，便于开发和生产环境部署。

- [x] **5.1 完善后端 Dockerfile**
  - [x] **5.1.1** 基于 `oven/bun:latest` 或 `oven/bun:slim` 作为基础镜像，采用多阶段构建（builder + runner）。
  - [x] **5.1.2** 复制 `backend/package.json` 和 `bun.lockb`（若存在），安装依赖。
  - [x] **5.1.3** 复制源码，构建生产版本（若需编译 TypeScript）。
  - [x] **5.1.4** 设置 `WORKDIR /app`，暴露 `8080` 端口，定义 `CMD ["bun", "src/index.ts"]` 或启动编译后的文件。
  - [x] **5.1.5** 确保 `Dockerfile` 支持通过环境变量 `PORT`、`DB_PATH` 等覆盖默认值。

- [x] **5.2 编写 docker-compose.yml**
  - [x] **5.2.1** 在根目录或 `backend/` 下创建 `docker-compose.yml`，定义 `backend` 服务：
    - 构建上下文指向 `./backend`。
    - 端口映射：`"8080:8080"`（或 `"${PORT:-8080}:8080"`）。
    - 环境变量文件：引用 `.env`（开发）或 `.env.production`。
    - 数据卷挂载：`./backend/data:/app/data`（确保 SQLite 数据库持久化）。
  - [x] **5.2.2** 添加 `restart: unless-stopped` 策略。
  - [x] **5.2.3** 若有前端构建需求，可考虑添加前端服务（但 v1.0 可先单独运行前端 dev server，此部分可选）。

- [x] **5.3 环境变量配置模板**
  - [x] **5.3.1** 在 `backend/` 下提供 `.env.example`，包含所有可配置变量：
    ```
    PORT=8080
    DB_PATH=./data/mermaid.db
    NODE_ENV=production
    ```
  - [x] **5.3.2** 在根目录也提供一份 `.env.example` 用于整体项目（可选）。
  - [x] **5.3.3** 在 `docker-compose.yml` 中通过 `env_file` 或 `environment` 引用这些变量。

- [x] **5.4 开发环境优化（可选）**
  - [x] **5.4.1** 创建 `docker-compose.override.yml`，用于开发时挂载源码以实现热重载（如 `bun --watch`）。
  - [x] **5.4.2** 或提供单独的 `docker-compose.dev.yml`，设置 `command: bun run dev`。

- [x] **5.5 文档更新**
  - [x] **5.5.1** 在根目录 `README.md` 和 `README.zh.md` 中添加“使用 Docker 运行”章节，说明如何通过 `docker-compose up` 启动服务。
  - [x] **5.5.2** 在 `backend/README.md` 中补充 Docker 构建与运行说明。

---

## 验收标准（Definition of Done）
- [x] 后端所有 API 可正常响应，SQLite 数据持久化，迁移自动运行。
- [x] 前端项目列表可正常展示所有项目，支持新建、打开、删除、搜索。
- [x] 编辑器完全替换 localStorage 为后端 API，保存状态可见。
- [x] 多设备切换（如另一浏览器）可看到相同项目列表，内容一致（单用户场景）。
- [x] 无阻塞性 Bug，控制台无报错，CORS 正常。
- [x] 根目录和 backend 目录均有完善的 README 文档。
- [x] **新增**：前端 UI 文案均为纯英文（或遵循官方 i18n 机制），无硬编码中文。
- [x] **新增**：根目录及 backend 目录均提供中英文双语 README，且同步更新。
- [x] **新增**：可通过 Docker Compose 一键启动后端服务，SQLite 数据挂载到宿主机持久化。

---

## 附录：技术细节速查
- **后端端口**：`8080`（可配）
- **前端端口**：`5173` / `3000`（视 Vite/Webpack 而定）
- **数据库**：Bun 内置 SQLite (`bun:sqlite`)，文件存储于 `backend/data/mermaid.db`
- **ID 生成**：Node.js `crypto.randomUUID()`
- **时间格式**：Unix 时间戳（毫秒），前端展示时转换
- **CORS**：允许所有来源（v1.0），后续可收紧

---

**开发执行建议**：按 `M0 → M1 → M2 → M3 → M4 → M5` 顺序推进，每完成一个小节勾选对应 Checkbox。M4 和 M5 可在 M3 完成后作为迭代增强进行，不影响 v1.0 核心功能交付。

## 后续迭代考虑（v2.0+）
- 用户认证与多用户隔离
- 项目共享/公开链接
- 版本历史与冲突合并
- 服务端渲染流程图预览
