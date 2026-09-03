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

### 方式一：本地直接运行 (pnpm Workspace)

#### 1. 在根目录一键安装所有依赖
```bash
pnpm install
```

#### 2. 启动服务
- **同时启动前端与后端**：
  ```bash
  pnpm dev
  ```
- **或单独启动**：
  ```bash
  pnpm dev:backend   # 后端 API 服务 (http://localhost:8080)
  pnpm dev:frontend  # 前端编辑器 (http://localhost:3000)
  ```

#### 3. 构建与测试
- 全局构建：`pnpm build`
- 执行测试：`pnpm test`（或 `pnpm test:backend`）


---

### 方式二：使用 Docker 部署

#### 生产模式（全栈一键启动）
```bash
# 启动前端与后端服务（自动持久化数据）
docker compose up -d

# 查看容器日志
docker compose logs -f
```

#### 开发模式（源码挂载与热重载）
```bash
docker compose -f docker-compose.dev.yml up
```


---

## 环境变量配置

复制 `.env.example` 为 `.env` 或按需配置：

```env
# 后端配置
PORT=8080
DB_PATH=./data/mermaid.db
NODE_ENV=production

# 前端配置
VITE_API_BASE_URL=http://localhost:8080/api
```

---

## 文档导航

- [后端 API 文档 (中文)](backend/README.zh.md) | [Backend API Documentation (English)](backend/README.md)
- [贡献指南 (中文)](CONTRIBUTING.zh.md) | [Contributing Guidelines (English)](CONTRIBUTING.md)
- [开发路线图 (ROADMAP.md)](ROADMAP.md)

---

## 许可证

[MIT License](LICENSE)

