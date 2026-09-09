# Mermaid Live Editor 与 Node.js + SQLite 持久化存储后端

[English](README.md) | 简体中文

本项目为官方 [mermaid-live-editor](https://github.com/mermaid-js/mermaid-live-editor) 增加了基于 **Node.js (Express + better-sqlite3)** 的云端持久化存储后端，实现个人图表的多端同步、持久化管理与实时防抖自动保存。

---

## 架构概览

- **前端 (`packages/mermaid-vault-frontend/`)**: 基于 SvelteKit 与 TypeScript（官方 Git 子模块）。包含“我的图表”管理面板、1.5 秒防抖自动云端同步、自定义图表标题编辑及可视化保存状态提示。
- **后端 (`packages/mermaid-vault-backend/`)**: 基于 **Node.js (LTS)**、**Express** 与 **`better-sqlite3`** 构建的稳健 REST API 服务，包含启动时自动数据库迁移、CORS 支持、单文件 SQLite 持久化存储及自动化 Vitest 测试套件。

```
+--------------------------+       HTTP REST API       +-------------------------+
|   Mermaid Live Editor    | <-----------------------> |   Node.js API Server    |
|   (前端 :80/:8081)       |   (CORS / JSON DTOs)      |     (后端 :8080)        |
+--------------------------+                           +-------------------------+
                                                                    |
                                                                    v
                                                            +---------------+
                                                            | SQLite DB     |
                                                            | (mermaid.db)  |
                                                            +---------------+
```

---

## 功能特性

- **图表管理面板 (`/dashboard`)**:
  - 可折叠的工作区侧边栏：支持工作区的新建、重命名、删除与切换；
    内置 `Default` 工作区接收未分配的图表。
  - 浏览保存在 SQLite 数据库中的所有 Mermaid 图表。
  - 支持按标题或代码内容进行实时前端模糊搜索过滤（搜索框位于顶部导航栏中央）。
  - 支持多选、全选与批量删除；新建图表自动归属于创建时所在的工作区。
- **后端缓存图表预览**:
  - 图表卡片与书签卡片优先从后端加载缓存的预览 SVG（深浅主题分别存储，
    以代码 SHA-256 哈希作为新鲜度键）。
  - 当代码已变更或暂无预览时，前端自动回退到实时渲染，并将新预览回填至后端。
- **书签卡片化与预览图**:
  - Bookmarks 面板以卡片网格展示每个书签并附带图表预览，
    同时保留原有的重命名 / 恢复 / 打开 / 删除操作。
- **自托管的分享与导出面板**:
  - Share 按钮改为打开右侧面板（与 Bookmarks/Timeline 一致的布局），
    并合并了原 Actions 卡片：PNG/SVG 导出、复制图片、复制 Markdown、
    加载 Gist 与 Embed 代码全部集中在一处。
  - 面板中的分享链接（PNG/SVG/Markdown 缩略图）均指向当前页面域名，
    由后端渲染端点（`GET /api/render/svg/:state`、
    `GET /api/render/img/:state?type=png`）通过无头 Chromium 提供，
    不再依赖 mermaid.ai / mermaid.ink / Kroki 等外部服务。
- **实时云端同步 (`/diagram?id=xxx`)**:
  - 编辑代码或修改标题时，防抖 1.5 秒自动同步保存至后端数据库。
  - 顶部保存状态清晰可见：*Saving...*、*Saved* 或 *Save failed (Click to retry)*。
  - 新建图表保存后自动将 `diagramId` 同步至浏览器地址栏（无须刷新页面）。
- **面向 AI Agent 的 MCP 服务器**:
  - 后端将自身 REST API 封装为 Model Context Protocol 工具（stdio +
    Streamable HTTP `/api/mcp`），让 AI Agent 能够代替用户保存、整理、
    渲染与分享图表。
  - 内置 Agent 使用说明；详见 [docs/mcp.zh.md](docs/mcp.zh.md)
    （[English](docs/mcp.md)）。
- **全栈 Docker 编排部署**:
  - 一键式生产环境 Docker Compose 部署前端与后端，数据目录持久化挂载。
  - 提供开发环境 Compose 配置（支持源码热重载）。
- **全套双语文档与国际化对齐**:
  - 全套中英文双语文档同步维护。
  - 前端 UI 遵循官方 Mermaid Live Editor 原生纯英文规范。

---

## 环境要求

- **Node.js**: `>= 20` (推荐 LTS 版本)
- **pnpm**: `>= 9` (推荐 10+)
- **Docker & Docker Compose**（可选，用于容器化部署）

---

## 快速开始

### 方式一：本地直接运行

#### 1. 启动后端 API 服务
```bash
cd packages/mermaid-vault-backend
pnpm install
pnpm dev
```
后端服务默认启动于 `http://localhost:8080`，首次启动会自动创建 `./data/mermaid.db` 数据库文件及数据表。

#### 2. 启动前端编辑器
```bash
cd packages/mermaid-vault-frontend
pnpm install
pnpm dev
```
前端编辑器默认启动于 `http://localhost:8081`。

也可以在仓库根目录一键同时启动前后端：
```bash
pnpm run dev
```

> **工作原理**：开发阶段前端始终请求相对路径 `/api`，由 Vite 开发服务器将 `/api/*` 代理到后端（默认 `http://localhost:8080`，可通过 `MERMAID_API_PROXY_TARGET` 覆盖）。请求保持同源，无需任何 CORS 配置。

---

### 方式二：使用 Docker 部署

Mermaid Vault 在生产环境中采用统一的单容器全栈架构：后端 Express 同时托管 REST API 以及 SvelteKit 前端静态资源，仅暴露单个端口（默认 `8080`），彻底消除跨域问题与反向代理开销。

#### 生产模式（单容器全栈启动）

```bash
# 一次性：从模板生成环境变量文件
cp .env.example .env

# 启动单一全栈容器（Express + SvelteKit 静态构建产物 + SQLite 持久化）
docker compose up -d

# 查看容器日志
docker compose logs -f
```

启动后，在浏览器访问 `http://localhost:8080`（或 `http://<主机IP>:${PORT}`）即可直接使用。

**反向代理部署**：将您的 Nginx/Caddy/Traefik 指向端口 8080 正常转发即可（如 `proxy_pass http://127.0.0.1:8080;`）。由于前端与 API 完全同源，无需任何 CORS 跨域配置。

#### 开发模式（源码挂载与热重载）

在本地开发时，技术栈仍然会自动拆分为两个容器（Vite 开发服务器 + Express 后端），以支持热重载（HMR）：

```bash
# 使用 pnpm 快捷脚本启动开发环境
pnpm dev

# 或直接使用 Docker Compose 启动
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# 查看开发日志
pnpm dev:logs

# 停止开发环境
pnpm dev:down
```

前端 Vite 开发服务器运行于 `http://localhost:8081`，并自动将 `/api` 请求代理到后端容器（`http://localhost:8080`）。

#### 容器化测试

在独立的测试容器中运行全量自动化测试套件：

```bash
pnpm test
# 或：docker compose -f docker-compose.yml -f docker-compose.test.yml run --build --rm app-test
```

#### 工作区常用脚本 (`package.json`)

| 命令 | 说明 |
|---|---|
| `pnpm dev` | 在后台启动开发容器（`backend` + `frontend`） |
| `pnpm dev:logs` | 实时查看开发容器日志 |
| `pnpm dev:down` | 停止并移除开发容器 |
| `pnpm dev:reset` | 重置容器、重新执行迁移并重启开发栈 |
| `pnpm migrate` | 通过一次性容器执行数据库迁移 |
| `pnpm test` | 在 Docker 容器中执行自动化测试套件 |
| `pnpm build:image` | 本地构建单一生产镜像（`mermaid-vault:local`） |
| `pnpm build:test` | 本地构建测试镜像目标（`backend-builder`） |
| `pnpm clean` | 停止容器并清理关联数据卷 |
| `pnpm clean:dev:port` | 读取 `.env` 并自动清除开发环境端口占用（8081、8080、9229 等） |
| `pnpm shell` | 进入运行中的后端容器 Shell 环境 |

#### 预构建镜像 (GHCR)

单一全栈多架构镜像发布在 GitHub Container Registry (`ghcr.io`)：
`ghcr.io/geeksquirrel/mermaid-vault:latest`

如需直接使用预构建镜像，`docker-compose.yml` 默认已配置拉取 GHCR 镜像：

```bash
cp .env.example .env
docker compose pull
docker compose up -d
```

---

## 生产环境变量与配置

生产环境中前后端已实现一体化运行（由单一容器托管 Express REST API 与前端静态 SPA），因此生产环境只需提供 **`BASE_URL`** 环境变量即可满足所有对外路由与链接生成需求：

| 变量名 | 作用范围 | 默认值 | 说明 |
|---|---|---|---|
| `BASE_URL` | 生产容器 | *(留空)* | 统一对外服务的基准 URL（如 `https://mermaid.example.com` 或 `http://localhost:8080`）。用于 MCP 生成图表编辑/查看分享链接，以及前端 SPA 运行时配置。留空时默认使用浏览器当前同源相对路径 `/api`。 |
| `PORT` | 宿主机端口 | `8080` | 映射到宿主机的服务端口。 |
| `TAG` | 镜像版本 | `latest` | GHCR 镜像标签。 |

开发环境（`docker-compose.dev.yml`）可选配置：
| 变量名 | 作用范围 | 默认值 | 说明 |
|---|---|---|---|
| `FRONTEND_PORT` | 开发前端 | `8081` | Vite 开发服务器映射端口。 |
| `BACKEND_PORT` | 开发后端 | `8080` | Node.js Express 后端端口。 |
| `DEBUG_PORT` | 调试端口 | `9229` | Node.js Inspector 调试端口。 |

配置示例（`.env`）：
```env
PORT=8080
BASE_URL=https://mermaid.example.com
```

---

## 文档导航

- [后端 API 文档 (中文)](packages/mermaid-vault-backend/README.zh.md) | [Backend API Documentation (English)](packages/mermaid-vault-backend/README.md)
- [MCP 服务器 — AI Agent 使用指南 (中文)](docs/mcp.zh.md) | [MCP Server — AI Agent Guide (English)](docs/mcp.md)
- [贡献指南 (中文)](CONTRIBUTING.zh.md) | [Contributing Guidelines (English)](CONTRIBUTING.md)
- [开发路线图 (ROADMAP.md)](ROADMAP.md)

---

## 许可证

[MIT License](LICENSE)

