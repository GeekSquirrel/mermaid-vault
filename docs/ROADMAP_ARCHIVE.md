# Historical Roadmap Archive (v1.0, v2.0 & v2.1)

> This document contains the full historical task list, execution steps, and acceptance criteria for **Mermaid Live Editor with Persistent Storage (v1.0, v2.0 & v2.1)**.
> All milestones listed below have been completed. For the current high-level roadmap and future planning, see [ROADMAP.md](../ROADMAP.md).

---

# Plan: Mermaid Live Editor with Bun.js Backend (Persistent Storage) v1.0

> **目标**：为 [mermaid-live-editor](https://github.com/mermaid-js/mermaid-live-editor) 增加 **Bun.js + SQLite** 后端，实现个人项目的云端持久化存储（多端切换），保留本地编辑体验。  
> **范围**：v1.0 仅支持单用户单端操作，暂不处理并发修改冲突，默认用户同一时间只操作同一界面。

---

## 里程碑概览

| 阶段 | 描述 | 状态 |
|------|------|------|
| **M0** | 环境准备与项目结构搭建 | ✅ 已完成 |
| **M1** | 后端核心开发（数据库 + CRUD API） | ✅ 已完成 |
| **M2** | 前端改造（项目浏览界面 + 存储逻辑替换） | ✅ 已完成 |
| **M3** | 联调、端到端测试与收尾 | ✅ 已完成 |
| **M4** | v1.1 国际化与文档同步（修正） | ✅ 已完成 |
| **M5** | v1.2 Docker 化与部署配置（增强） | ✅ 已完成 |

---

## M0 – 环境准备与项目结构
### 0.1 仓库与子模块初始化
- [x] **0.1.1** 在根目录初始化 Git 仓库（若尚未）。
- [x] **0.1.2** 将 `mermaid-vault-frontend` 添加为 Git 子模块（指向你的 fork）。
- [x] **0.1.3** 进入子模块目录，添加官方仓库为 upstream。
- [x] **0.1.4** 确认子模块处于最新稳定分支。

### 0.2 后端项目初始化
- [x] **0.2.1** 在根目录创建 `backend/` 文件夹。
- [x] **0.2.2** 进入 `backend/`，执行 `bun init -y` 初始化 Bun 项目。
- [x] **0.2.3** 修改 `backend/package.json`，添加启动脚本。
- [x] **0.2.4** 安装必要依赖。
- [x] **0.2.5** 创建 `backend/tsconfig.json`。

### 0.3 目录结构创建
- [x] **0.3.1** 在 `backend/src/` 下创建子目录：`routes/`, `controllers/`, `models/`, `db/`, `types/`, `middleware/`。
- [x] **0.3.2** 在 `backend/` 下创建 `data/` 文件夹。
- [x] **0.3.3** 在 `backend/` 下创建 `migrations/` 文件夹。
- [x] **0.3.4** 创建 `.gitignore`。

### 0.4 前端环境确认
- [x] **0.4.1** 进入 `mermaid-vault-frontend/`，执行依赖安装。
- [x] **0.4.2** 确认前后端端口不冲突。

---

## M1 – 后端核心开发（Bun + SQLite + API）
### 1.1 数据库层（Schema & Migration）
- [x] **1.1.1** 在 `backend/migrations/` 下创建 `001_init.sql` 建表语句。
- [x] **1.1.2** 在 `backend/src/db/index.ts` 中实现数据库初始化模块与迁移。
- [x] **1.1.3** 在 `backend/src/types/index.ts` 中定义 DTO 与数据接口。
- [x] **1.1.4** 设置环境变量机制。

### 1.2 数据访问层（Repository / Model）
- [x] **1.2.1** 在 `backend/src/models/ProjectModel.ts` 中实现 CRUD 方法。
- [x] **1.2.2** 编写单元测试验证数据操作。

### 1.3 业务逻辑层（Controller）
- [x] **1.3.1** 在 `backend/src/controllers/projectController.ts` 中封装 RESTful 响应。
- [x] **1.3.2** 统一错误处理格式。

### 1.4 API 路由层（RESTful Endpoints）
- [x] **1.4.1** 在 `backend/src/routes/projects.ts` 中定义路由。
- [x] **1.4.2** 聚合路由统一前缀 `/api`。
- [x] **1.4.3** 添加健康检查端点 `GET /health`。

### 1.5 主服务器与中间件
- [x] **1.5.1** 在 `backend/src/index.ts` 中创建服务实例与 CORS 配置。
- [x] **1.5.2** 实现请求体解析与预检处理。
- [x] **1.5.3** 挂载路由中间件。

### 1.6 后端自测
- [x] **1.6.1** 测试所有 API 端点。
- [x] **1.6.2** 确认 SQLite 数据库文件及索引生成正确。

---

## M2 – 前端改造（项目浏览界面 + API 集成）
### 2.1 前端 API 客户端封装
- [x] **2.1.1** 在 `mermaid-vault-frontend/src/lib/services/api.ts` 中封装 HTTP 客户端。

### 2.2 新增“项目浏览”页面
- [x] **2.2.1** 在 `mermaid-vault-frontend/src/routes/(app)/projects/+page.svelte` 下创建组件。
- [x] **2.2.2** 实现项目删除与确认逻辑。
- [x] **2.2.3** 实现新建项目跳转。
- [x] **2.2.4** 导航栏与主菜单集成“我的项目”入口。

### 2.3 编辑器存储逻辑替换
- [x] **2.3.1** 替换 `localStorage` 保存逻辑为 API 后端存储。
- [x] **2.3.2** 编辑器根据 URL 参数 `projectId` 动态加载项目。
- [x] **2.3.3** 实现自动保存（防抖）与标题实时编辑更新。
- [x] **2.3.4** 完善降级容错机制。

### 2.4 用户体验增强
- [x] **2.4.1** 编辑器内增加保存状态提示（“已保存”、“保存中...”、“保存失败”）。
- [x] **2.4.2** 处理 API 网络错误并保留编辑内容。
- [x] **2.4.3** 项目列表增加空状态与搜索过滤。

### 2.5 清理与适配
- [x] **2.5.1** 验证项目加载与路由切换。
- [x] **2.5.2** 验证新建项目首次保存自动写入 `projectId`。
- [x] **2.5.3** 确保前端原有功能不受破坏。

---

## M3 – 联调、端到端测试与收尾
- [x] **3.1** 前后端联调无跨域错误。
- [x] **3.2** 全量手动功能测试（新建、编辑、删除、检索、多设备访问）。
- [x] **3.3** 异常边界测试（网络断开重试、数据库错误处理）。
- [x] **3.4** 初版文档与 Dockerfile 编写。

---

## M4 – v1.1 国际化与文档同步（修正）
- [x] **4.1** 前端 UI 用户可见文案纯英文规范对齐。
- [x] **4.2** 根目录 `README.md` 与 `README.zh.md` 双语同步。
- [x] **4.3** `backend/README.md` 与 `backend/README.zh.md` 双语同步。
- [x] **4.4** 建立文档中英文同步维护机制。

---

## M5 – v1.2 Docker 化与部署配置（增强）
- [x] **5.1** 完善后端多阶段构建 `Dockerfile`。
- [x] **5.2** 编写基础 `docker-compose.yml` 与持久化卷挂载。
- [x] **5.3** 提供 `.env.example` 环境变量模板。
- [x] **5.4** 开发环境优化配置。
- [x] **5.5** 补充 Docker 部署使用文档。

---

# Plan: Mermaid Live Editor with Persistent Storage (v2)

> **目标**：在 v1 的基础上，将后端运行时从 Bun.js 迁移至 Node.js，统一使用 pnpm 进行依赖管理与 Workspace 多包管理，并实现前后端 Docker 镜像分离与 Docker Compose 统一编排。

---

## 里程碑概览

| 阶段 | 描述 | 状态 |
|------|------|------|
| **M6** | 后端重构：Bun.js → Node.js + Express + better-sqlite3 + pnpm | ✅ 已完成 |
| **M7** | 统一 Docker 编排、Workspace 多包管理与部署优化 | ✅ 已完成 |

---

## M6 – 后端重构：Bun.js → Node.js + pnpm
### 6.1 依赖与工具链迁移
- [x] **6.1.1** 移除 Bun 依赖，引入 `express`, `better-sqlite3`, `cors`, `dotenv`, `tsx`, `vitest`。
- [x] **6.1.2** 包管理器切换为 `pnpm`，生成 `pnpm-lock.yaml`。
- [x] **6.1.3** 调整 `backend/tsconfig.json` 适配 `NodeNext` ESM 规范。
- [x] **6.1.4** 配置构建与启动脚本（`tsc` 输出到 `dist/`）。

### 6.2 数据库层适配
- [x] **6.2.1** 使用 `better-sqlite3` 实现连接单例与 WAL 模式。
- [x] **6.2.2** 迁移脚本自动执行支持。
- [x] **6.2.3** 在 `ProjectModel` 中完成 CRUD 适配与 `crypto.randomUUID()` 替换。

### 6.3 服务器与路由重构
- [x] **6.3.1** 使用 Express 创建应用与 CORS / JSON 中间件。
- [x] **6.3.2** 使用 `express.Router` 重构 `/api/projects` 路由。
- [x] **6.3.3** 添加健康检查端点 `GET /health`。
- [x] **6.3.4** 统一错误处理中间件。

### 6.4 测试与验证
- [x] **6.4.1** 基于 Vitest + Supertest 编写自动化测试（5/5 全部通过）。
- [x] **6.4.2** 回归测试所有 REST API 端点。

### 6.5 文档与环境更新
- [x] **6.5.1** 更新后端双语 README。
- [x] **6.5.2** 更新根目录双语 README。
- [x] **6.5.3** 更新环境变量配置。

---

## M7 – 统一 Docker 编排、Workspace 管理与部署优化
### 7.1 前端 Docker 化
- [x] **7.1.1** 编写前端 multi-stage Dockerfile（Node.js 构建 + Nginx 提供静态服务）。
- [x] **7.1.2** 支持 `VITE_API_BASE_URL` 构建参数。

### 7.2 后端 Dockerfile 优化
- [x] **7.2.1** 采用 `node:22-alpine` 多阶段构建，支持 pnpm 原生编译权限配置。
- [x] **7.2.2** 支持端口与数据库持久化路径环境变量注入。

### 7.3 全栈 Docker Compose 统一编排
- [x] **7.3.1** 根目录编写 `docker-compose.yml`，编排 `frontend` 与 `backend` 服务。
- [x] **7.3.2** 编写 `docker-compose.dev.yml` 支持本地源码挂载热更新。
- [x] **7.3.3** 生产环境变量模板 `.env.production` 与 `.env.example`。

### 7.4 根目录 pnpm Workspace 单体仓库管理
- [x] **7.4.1** 配置根目录 `pnpm-workspace.yaml` 与 `package.json`。
- [x] **7.4.2** 提供根目录便捷脚本：`pnpm dev`（并行启动）、`pnpm build`、`pnpm test`。
- [x] **7.4.3** 适配 SvelteKit `vitePreprocess`，确保 Workspace 全局构建顺畅。

---

## 验收标准汇总 (DoD)
- [x] 后端迁移至 Node.js + Express + better-sqlite3 + pnpm，API 行为与数据库兼容。
- [x] 前端项目浏览与自动保存无缝对接后端 API。
- [x] Docker Compose 一键启动全栈服务，支持数据持久化卷挂载。
- [x] 根目录通过 pnpm workspace 统一管理前后端多包开发与构建。
- [x] 全套双语文档（`README`, `CONTRIBUTING`, `backend/README`）同步就绪。

---

# Plan: Mermaid Live Editor — v2.1 自托管适配与 UI 清理

> **目标**：移除官方 Mermaid Live Editor 中与外部服务绑定的引流元素，并重构保存、导航与项目浏览体验，使项目更适合自托管场景。  
> **状态**：✅ 全部完成。以下为压缩归档的任务清单（保留关键决策与规范细节）。

## 里程碑概览

| 阶段 | 描述 | 状态 |
|------|------|------|
| **v2.1 自托管清理** | 移除官方引流元素（横幅 / AI / Playground） | ✅ 已完成 |
| **v2.1 体验重构** | 历史面板拆分、导航栏重做、自动保存与状态标识统一、编辑器与 Projects 页重构 | ✅ 已完成 |

---

## 1. 自托管清理（移除官方引流）
- [x] 移除顶部推广横幅（"Try Mermaid Advanced Editor — OSS users get 10% off with code JS26"）。
- [x] 移除画板左上角 AI/语音按钮（"Edit with AI" / "Edit with voice"）。
- [x] 移除代码编辑器行号前的 AI 提示及点击弹窗（清除所有引流至官方的代码）。
- [x] 移除报错弹出提示中的 "Create a free account to repair with AI" 与 AI Repair 按钮。
- [x] "Save diagram" 按钮由跳转官网改为本地手动保存（调用已有保存接口）。
- [x] GitHub 图标链接指向 https://github.com/GeekSquirrel/mermaid-editor。
- [x] "Data security" 文案替换为自托管版本介绍说明。
- [x] 移除左上角菜单中的 "Edit in Playground"。

## 2. 历史面板拆分
- [x] **Bookmarks（原 Saved）**：手动点击保存时生成条目，存后端 SQLite，支持跨设备同步（后端同步新增书签能力）。
- [x] **Timeline**：每分钟自动快照一次，仅存浏览器 localStorage；移除面板顶栏的上传与保存按钮，保持其纯粹性。

## 3. 导航栏重做
- [x] 左侧移除 "Mermaid Live Editor" 及 LOGO，改为 `Projects/${Project Name}` 面包屑（My Projects 页仅显示 `Projects`）；点击 `Projects` 跳转项目页，点击项目名可改名；移除右侧重复的 Projects 按钮与重命名文本框。
- [x] GitHub 图标移至导航栏最右侧；Share 按钮右数第二位，文字前加分享 icon。
- [x] 删除导航栏 Save diagram 按钮。
- [x] History 按钮拆分为 Bookmarks（右数第四，右上角气泡显示书签数量，为 0 时不显示）与 Timeline（右数第三），均为 `icon 文字` 形式；Bookmarks 面板继承原全部功能，顶栏保存 icon 替换为带加号书签 icon。
- [x] 画板右上角工具栏（缩放/全屏区）新增保存按钮与带加号书签按钮（书签功能与 Bookmarks 面板一致）。
- [x] saving/saved 等状态标识移至 `Projects/${Project Name}` 右侧。

## 4. 自动保存逻辑（均指保存项目最新状态到 SQLite，非书签快照）
- [x] 重命名/新建项目：自动保存但不显示 saving/saved 标识。
- [x] 代码编辑器 10 秒无变更自动保存（显示标识）。
- [x] Timeline 每分钟生成 localStorage 快照时同步执行一次自动保存（显示标识）。
- [x] 点击编辑器外部时使其失焦并触发一次自动保存（显示标识）。
- [x] 切换 sample 时自动保存但不显示标识。

## 5. 状态标识增强（`Projects/${Project Name}` 右侧）
- [x] 书签保存成功显示粉红主题 `bookmarked` 标识，3 秒后淡出；失败显示红色 `Failed to save bookmark`。
- [x] 保存 <3 秒完成不显示 `saving`，成功后直接显示 `saved`；>3 秒先显示 `saving` 再切换 `saved`；失败显示 `Failed to save diagram`。
- [x] `saved` 标识同样 3 秒后淡出。
- [x] 移动端改为右下角弹出条形通知（保持原配色；<3 秒不显示 saving；成功/失败/报错通知均 3 秒淡出）。

## 6. 文本编辑器
- [x] 移除 Config 标签页，配置合并进 code 标签页：配置语法由 JSON 改为文档顶部 `---` 分隔符包围的 YAML frontmatter，配置与绘图代码均可正确解析。
- [x] 移除编辑器顶栏最右侧的 doc 按钮。
- [x] 新增 Samples 标签页（置于原 doc 位置，icon 不变）：图表类型名称作左上角小标题（主题粉红色），样例标题作按钮以 flex 排列，纵向列表展示全部类型；仅一个样例时命名 `Basic ${类型名称}`。
- [x] 打开 Samples 面板不遮盖 code 按钮，顶栏 code/samples 按钮样式统一（选中/未选均以 samples 按钮为准）。
- [x] code 编辑器滚动条样式与 Samples 面板一致。
- [x] 编辑器代码与某 sample 一致时高亮该样例（选择成功后高亮；从 code 返回时重新匹配高亮）。

YAML frontmatter 配置格式示例：

```markdown
---
config:
    theme: dark
---
architecture-beta
    group api(cloud)[API]

    service db(database)[Database] in api
    service disk1(disk)[Storage] in api
    service disk2(disk)[Storage] in api
    service server(server)[Server] in api

    db:L -- R:server
    disk1:T -- B:server
    disk2:T -- B:db
```

## 7. Projects 页面升级
- [x] 左侧菜单 "My Projects" 更名 "Projects"。
- [x] 移除桌面端导航栏 GitHub 图标左侧的 New Projects 按钮；移动端导航栏最右新增 GitHub 图标。
- [x] 搜索栏 + 卡片列表最外侧容器与导航栏左右基准线对齐（菜单最左 / GitHub 图标最右）。
- [x] 移除搜索栏中的 `My Projects` 大标题及 "Manage your Mermaid diagrams…" 副标题代码。
- [x] 搜索框置于搜索栏最左（设合适最大宽度）；刷新与 New Projects 并入一个父容器置于最右。
- [x] 修复 Search projects 图标向下偏移。
- [x] 项目卡片增高，预览由代码改为渲染结果；`IntersectionObserver` 懒加载（即将可见时再加载）；语法错误卡片直接显示 syntax error 内容。
- [x] 卡片改为 grid 布局，1:1 宽高比，列数随屏宽自适应（参考：16:9 4K 横屏 5 列 / 竖屏 3 列），间距参照整体布局左右边距；搜索框边框可见且与卡片设计语言一致。

## 8. 移动端界面修复
- [x] 修复编辑/预览切换按钮失效问题。
- [x] 修复代码编辑器行号一列颜色不正确问题。
