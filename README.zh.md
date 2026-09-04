# Mermaid Live Editor 与 Node.js + SQLite 持久化存储后端

[English](README.md) | 简体中文

本项目为官方 [mermaid-live-editor](https://github.com/mermaid-js/mermaid-live-editor) 增加了基于 **Node.js (Express + better-sqlite3)** 的云端持久化存储后端，实现个人图表项目的多端同步、持久化管理与实时防抖自动保存。

---

## 架构概览

- **前端 (`mermaid-live-editor/`)**: 基于 SvelteKit 与 TypeScript（官方 Git 子模块）。包含“我的项目”管理面板、1.5 秒防抖自动云端同步、自定义项目标题编辑及可视化保存状态提示。
- **后端 (`backend/`)**: 基于 **Node.js (LTS)**、**Express** 与 **`better-sqlite3`** 构建的稳健 REST API 服务，包含启动时自动数据库迁移、CORS 支持、单文件 SQLite 持久化存储及自动化 Vitest 测试套件。

```
+--------------------------+       HTTP REST API       +-------------------------+
|   Mermaid Live Editor    | <-----------------------> |   Node.js API Server    |
|   (前端 :80/:3000)       |   (CORS / JSON DTOs)      |     (后端 :8080)        |
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

- **项目管理面板 (`/projects`)**:
  - 浏览保存在 SQLite 数据库中的所有 Mermaid 图表。
  - 支持按标题或代码内容进行实时前端模糊搜索过滤。
  - 支持直接新建项目或一键删除指定项目。
- **后端缓存图表预览**:
  - 项目卡片与书签卡片优先从后端加载缓存的预览 SVG（深浅主题分别存储，
    以代码 SHA-256 哈希作为新鲜度键）。
  - 当代码已变更或暂无预览时，前端自动回退到实时渲染，并将新预览回填至后端。
- **书签卡片化与预览图**:
  - Bookmarks 面板以卡片网格展示每个书签并附带图表预览，
    同时保留原有的重命名 / 恢复 / 打开 / 删除操作。
- **实时云端同步 (`/edit?projectId=xxx`)**:
  - 编辑代码或修改标题时，防抖 1.5 秒自动同步保存至后端数据库。
  - 顶部保存状态清晰可见：*Saving...*、*Saved* 或 *Save failed (Click to retry)*。
  - 新建项目保存后自动将 `projectId` 同步至浏览器地址栏（无须刷新页面）。
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
cd backend
pnpm install
pnpm dev
```
后端服务默认启动于 `http://localhost:8080`，首次启动会自动创建 `./data/mermaid.db` 数据库文件及数据表。

#### 2. 启动前端编辑器
```bash
cd mermaid-live-editor
pnpm install
pnpm dev
```
前端编辑器默认启动于 `http://localhost:3000` (或 `:5173`)。

也可以在仓库根目录一键同时启动前后端：
```bash
pnpm run dev
```

> **工作原理**：开发阶段前端始终请求相对路径 `/api`，由 Vite 开发服务器将 `/api/*` 代理到后端（默认 `http://localhost:8080`，可通过 `MERMAID_API_PROXY_TARGET` 覆盖）。请求保持同源，无需任何 CORS 配置。

---

### 方式二：使用 Docker 部署

默认情况下，**仅前端容器向宿主机暴露端口**（端口 `80`）。后端容器仅在 Docker 内部网络中进行通信，外部无法直接访问，增强了后端服务的安全性与隔离性。

#### 生产模式（全栈一键启动）
```bash
# 启动前端与后端服务（自动持久化数据）
docker compose up -d

# 查看容器日志
docker compose logs -f
```
启动后，可在浏览器中通过 `http://localhost`（或使用 `APP_FRONTEND_PORT` 自定义的 `http://<主机IP>:<端口>`）直接访问，局域网访问开箱即用。前端 Nginx 会将 `/api/*` 反向代理到后端容器（`BACKEND_UPSTREAM`，默认 `backend:8080`），无需额外配置。

**反向代理部署**：将您的 Nginx/Caddy/Traefik 指向前端暴露的端口并正常转发即可（如 `proxy_pass http://127.0.0.1:<APP_FRONTEND_PORT>;`）。全程同源，前后端均无需 CORS 配置。

#### 开发模式（源码挂载与热重载）
```bash
docker compose -f docker-compose.dev.yml up
```

#### 预构建镜像 (GHCR)

镜像通过 GitHub Container Registry (`ghcr.io`) 发布：

- **前端镜像**：`ghcr.io/geeksquirrel/mermaid-vault-frontend`
- **后端镜像**：`ghcr.io/geeksquirrel/mermaid-vault-backend`

| 通道 | 触发方式 | 镜像标签 | 支持架构 |
|---|---|---|---|
| **Dev** | 手动（**Actions** → **Publish Dev Docker Images to GHCR** → **Run workflow**） | `dev`、commit SHA、可选自定义标签 | 默认 `linux/amd64`，可通过 `platforms` 输入追加 `linux/arm64` |
| **Release** | 自动，推送 `v*` 标签时触发（如 `v2.1.0`） | `X.Y.Z`、`X.Y`、`latest` | `linux/amd64`、`linux/arm64` |

发布新版本时，只需推送版本标签，即可自动构建多架构镜像：

```bash
git tag v2.1.0
git push origin v2.1.0
```

---

## 部署模式与环境变量配置

您可以通过配置 `API_BASE_URL` 环境变量，轻松在三种部署模式之间切换：

| 部署模式 | `API_BASE_URL` 设置 | 说明 |
|---|---|---|
| **1. 同源内部代理模式（默认推荐）** | 留空 / 不设置 | 前端使用相对路径 `/api`，由前端 Nginx 直接反向代理到后端容器。无跨域问题，仅对外暴露单个前端端口。 |
| **2. 共用外部域名/网关模式** | `API_BASE_URL=https://example.com/api` | 前端直接请求该绝对路径，适用于前后端挂在同一反向代理或统一网关下的场景。 |
| **3. 独立 API 域名模式（跨域）** | `API_BASE_URL=https://api.example.com` | 前端直接向独立后端域名发起跨域请求。需将后端 `CORS_ORIGIN` 设置为前端来源。后端同时兼容 `/api/projects` 与 `/projects`。 |

---

## 环境变量配置

复制 `.env.example` 为 `.env` 或按需配置：

| 变量名 | 目标服务 | 默认值 | 说明 |
|---|---|---|---|
| `APP_FRONTEND_PORT` | 前端容器 | `80` | 前端映射到宿主机的端口（替代原 `FRONTEND_PORT`）。 |
| `API_BASE_URL` | 前端容器 | *(留空)* | 运行时 API 基础 URL。留空则启用前端 Nginx 内部反向代理。 |
| `BACKEND_UPSTREAM` | 前端容器 | `backend:8080` | 前端 Nginx 将 `/api/` 代理到的后端源地址。当后端不在同一 Docker Compose 网络时修改此项。 |
| `PORT` | 后端容器 | `8080` | 后端容器内部监听端口。 |
| `DB_PATH` | 后端容器 | `/app/data/mermaid.db` | SQLite 数据库文件存储路径。 |
| `NODE_ENV` | 后端容器 | `production` | Node.js 运行环境。 |
| `CORS_ORIGIN` | 后端容器 *(可选)* | `*` | 逗号分隔的来源白名单，如 `https://example.com,https://app.example.com`。仅跨域访问 API（模式 3）时需要配置。 |
| `APP_BACKEND_PORT` | 后端容器 *(可选)* | *(未设置)* | 调试时可选的宿主机端口映射（如设置为 `8080`）。 |

`MERMAID_API_PROXY_TARGET`（仅开发环境）用于覆盖 Vite 开发代理 `/api` 的目标地址，本地默认 `http://localhost:8080`；开发 Compose 中已设置为 `http://backend:8080`。

配置示例（`.env`）：
```env
# 前端服务配置
APP_FRONTEND_PORT=80
API_BASE_URL=
# 可选：覆盖前端 Nginx 代理的后端源地址
# BACKEND_UPSTREAM=backend:8080

# 后端服务配置（容器内部参数）
PORT=8080
DB_PATH=/app/data/mermaid.db
NODE_ENV=production

# 可选：限制跨域 API 访问来源（逗号分隔白名单）
# CORS_ORIGIN=https://example.com

# 可选：后端独立调试宿主机端口映射
# APP_BACKEND_PORT=8080
```

---

## 文档导航

- [后端 API 文档 (中文)](backend/README.zh.md) | [Backend API Documentation (English)](backend/README.md)
- [贡献指南 (中文)](CONTRIBUTING.zh.md) | [Contributing Guidelines (English)](CONTRIBUTING.md)
- [开发路线图 (ROADMAP.md)](ROADMAP.md)

---

## 许可证

[MIT License](LICENSE)

