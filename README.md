# Mermaid Live Editor with Bun.js Backend (Persistent Storage)

本项目为官方 [mermaid-live-editor](https://github.com/mermaid-js/mermaid-live-editor) 增加了 **Bun.js + SQLite** 的云端持久化存储后端，实现个人图表项目的多端同步与持久化管理。

---

## 架构概览

- **前端 (Frontend)**: 基于 `mermaid-live-editor` 官方源码（SvelteKit + TypeScript），新增“我的项目”列表页、全自动防抖云端同步保存及项目标题编辑。
- **后端 (Backend)**: 使用 **Bun.js** + **SQLite (`bun:sqlite`)** 搭建极简、高性能的 RESTful API 服务，实现数据全自动迁移与 CRUD 操作。

```
+--------------------------+       HTTP API       +-------------------------+
|   Mermaid Live Editor    | <------------------> |    Bun.js API Server    |
|   (Frontend :3000)       |   (RESTful / CORS)   |     (Backend :8080)     |
+--------------------------+                      +-------------------------+
                                                               |
                                                               v
                                                       +---------------+
                                                       | SQLite DB     |
                                                       | (mermaid.db)  |
                                                       +---------------+
```

---

## 快速开始

### 运行环境准备
- **Bun**: `>= 1.0` (推荐 1.3+)
- **Node.js**: `>= 20`
- **pnpm**: `>= 9` (推荐 10+)

---

### 1. 启动后端 API 服务
```bash
cd backend
bun install
bun run dev
```
后端服务默认启动于 `http://localhost:8080`，首次启动会自动创建 `./data/mermaid.db` 数据库及数据表。

---

### 2. 启动前端 Live Editor
```bash
cd mermaid-live-editor
pnpm install
pnpm dev
```
前端服务默认启动于 `http://localhost:3000`。

---

## 功能说明

1. **项目浏览与管理** (`/projects`)：
   - 查看保存在 SQLite 中的所有 Mermaid 图表。
   - 支持实时标题/代码模糊搜索过滤。
   - 支持从列表新建项目或一键删除指定项目。
2. **实时云端同步** (`/edit?projectId=xxx`)：
   - 修改图表代码或项目标题时，防抖 1.5 秒自动同步保存至后端数据库。
   - 顶部状态栏提示“保存中...”、“已保存”或“保存失败”。
   - 新建项目在保存后自动同步 `projectId` 至浏览器 URL 地址栏。

---

## 许可证
MIT License
