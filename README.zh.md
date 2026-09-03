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
启动后，可在浏览器中通过 `http://localhost`（或 `http://localhost:80`）直接访问编辑器。

#### 开发模式（源码挂载与热重载）
```bash
docker compose -f docker-compose.dev.yml up
```

#### 预构建测试镜像 (GHCR)

测试版镜像通过 GitHub Container Registry (`ghcr.io`，架构支持 `linux/amd64`) 发布：

- **前端镜像**：`ghcr.io/geeksquirrel/mermaid-live-editor:dev`（或指定 commit SHA）
- **后端镜像**：`ghcr.io/geeksquirrel/mermaid-live-editor-backend:dev`（或指定 commit SHA）

镜像发布支持在 GitHub Actions 中手动触发：进入 GitHub 仓库页面 **Actions** → 选择 **Publish Dev Docker Images to GHCR** → 点击 **Run workflow** 即可触发构建与发布。

---

## 部署模式与环境变量配置

您可以通过配置 `API_BASE_URL` 环境变量，轻松在三种部署模式之间切换：

| 部署模式 | `API_BASE_URL` 设置 | 说明 |
|---|---|---|
| **1. 同源内部代理模式（默认推荐）** | 留空 / 不设置 | 前端使用相对路径 `/api`，由前端 Nginx 直接反向代理到后端容器。无跨域问题，仅对外暴露单个前端端口。 |
| **2. 共用外部域名/网关模式** | `API_BASE_URL=https://example.com/api` | 前端直接请求该绝对路径，适用于前后端挂在同一反向代理或统一网关下的场景。 |
| **3. 独立 API 域名模式（跨域）** | `API_BASE_URL=https://api.example.com` | 前端直接向独立后端域名发起跨域请求。后端已内置 CORS 支持，并同时兼容 `/api/projects` 与 `/projects`。 |

---

## 环境变量配置

复制 `.env.example` 为 `.env` 或按需配置：

| 变量名 | 目标服务 | 默认值 | 说明 |
|---|---|---|---|
| `APP_FRONTEND_PORT` | 前端容器 | `80` | 前端映射到宿主机的端口（替代原 `FRONTEND_PORT`）。 |
| `API_BASE_URL` | 前端容器 | *(留空)* | 运行时 API 基础 URL。留空则启用前端 Nginx 内部反向代理。 |
| `PORT` | 后端容器 | `8080` | 后端容器内部监听端口。 |
| `DB_PATH` | 后端容器 | `/app/data/mermaid.db` | SQLite 数据库文件存储路径。 |
| `NODE_ENV` | 后端容器 | `production` | Node.js 运行环境。 |
| `APP_BACKEND_PORT` | 后端容器 *(可选)* | *(未设置)* | 调试时可选的宿主机端口映射（如设置为 `8080`）。 |

配置示例（`.env`）：
```env
# 前端服务配置
APP_FRONTEND_PORT=80
API_BASE_URL=

# 后端服务配置（容器内部参数）
PORT=8080
DB_PATH=/app/data/mermaid.db
NODE_ENV=production

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

