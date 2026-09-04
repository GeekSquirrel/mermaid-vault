# 项目路线图：带持久化存储的 Mermaid Live Editor

[English](ROADMAP.md) | 简体中文

> **当前版本**：v2.1.0  
> **当前状态**：✅ v1.0、v2.0 与 v2.1 全部完成。  
> **历史归档**：如需查阅已完成阶段的逐项任务清单（Checkbox 拆解），请参阅 [完整历史路线图归档](docs/ROADMAP_ARCHIVE.md)。

---

## 1. 项目演进与历史里程碑概览

```mermaid
timeline
    title 项目发展时间线
    section v1.0 MVP
        M0 环境与结构搭建 : Git 子模块 + Bun.js 初始化
        M1 后端核心开发 : Bun.js + bun:sqlite + REST API
        M2 前端改造集成 : 项目浏览页面 + 防抖自动保存
        M3 端到端验收 : 跨端访问 + 错误边界处理
    section v1.1 - v1.2 增强
        M4 国际化与双语文档 : 英文 UI 对齐 + 双语规范
        M5 容器化部署 : 后端 Dockerfile + 宿主机数据卷挂载
    section v2.0 全栈标准化
        M6 Node.js 运行时迁移 : Node.js + Express + better-sqlite3 + pnpm
        M7 工作区与全栈编排 : 全栈 Docker Compose + 根目录 pnpm Workspace
    section v2.1 自托管适配
        UI 清理与体验重构 : 移除官方引流元素 + 保存/导航/项目页重构
```

### 已完成里程碑摘要

| 里程碑 | 目标范围 | 核心交付物 | 状态 |
|---|---|---|---|
| **v1.0 MVP (M0–M3)** | 持久化存储核心功能 | SQLite 数据库结构、CRUD API、前端项目浏览页（`/projects`）、`/edit` 防抖自动保存、`?projectId=` 路由机制。 | ✅ 已发布 |
| **v1.1 (M4)** | 文档与国际化对齐 | 前端界面文案与官方纯英文风格统一；建立根目录与后端的双语同步文档（`README`, `CONTRIBUTING`）。 | ✅ 已发布 |
| **v1.2 (M5)** | 容器化部署 | 后端多阶段构建 Dockerfile；SQLite 宿主机持久化卷映射。 | ✅ 已发布 |
| **v2.0 (M6–M7)** | 全栈技术栈与工作区重构 | 后端迁移至 Node.js 22 LTS、Express、`better-sqlite3`、Vitest 测试套件；根目录 `pnpm workspace` 统一管理前后端；全栈 `docker-compose.yml`（Nginx + Express + SQLite）。 | ✅ 已发布 |
| **v2.1** | 自托管适配与 UI 清理 | 移除官方引流元素；历史面板拆分为 Bookmarks（SQLite）与 Timeline（localStorage）；导航栏面包屑化与画板工具栏保存/书签按钮；统一自动保存与状态标识规则；配置合并进 code 标签页（YAML frontmatter）并新增 Samples 面板；Projects 页 1:1 网格渲染预览懒加载。 | ✅ 已发布 |

---

## 2. 当前技术栈矩阵 (v2.0)

| 模块 | 技术栈 | 所在目录 |
|---|---|---|
| **前端** | SvelteKit 2 + Svelte 5 + TailwindCSS + Monaco Editor + Vite | `mermaid-vault-frontend/` |
| **后端 API** | Node.js 22 LTS + Express + TypeScript + better-sqlite3 | `mermaid-vault-backend/` |
| **数据库** | SQLite（启用 WAL 模式与自动迁移） | `mermaid-vault-backend/data/mermaid.db` |
| **Monorepo 管理** | pnpm 11+ Workspaces | 根目录 `pnpm-workspace.yaml` |
| **容器编排** | Docker Compose（多阶段 Node.js + Nginx Alpine） | `docker-compose.yml` |
| **自动化测试** | Vitest + Supertest | `mermaid-vault-backend/src/**/*.test.ts` |

---

## v2.1 – 自托管适配与 UI 清理（✅ 已完成，已归档）
本版本聚焦于移除官方 Mermaid Live Editor 中与外部服务绑定的元素，并重构保存与导航体验，使项目更适合自托管场景。详细逐项任务清单（含关键决策与规范示例）已压缩归档至 [docs/ROADMAP_ARCHIVE.md](docs/ROADMAP_ARCHIVE.md)，关键变更摘要如下：

| 模块 | 关键变更 |
|---|---|
| **自托管清理** | 移除推广横幅、AI/语音按钮、行号 AI 提示、AI Repair 引流、`Edit in Playground` 菜单；保存改为本地 API；GitHub 链接指向 fork；数据安全文案改为自托管说明 |
| **历史面板** | 拆分为 Bookmarks（手动快照，存后端 SQLite，跨设备同步）与 Timeline（每分钟快照，仅存 localStorage） |
| **导航栏** | 左侧改为 `Projects/${Project Name}` 面包屑（点击项目名可改名）；Bookmarks/Timeline/Share/GitHub 重新排布；画板工具栏新增保存与书签按钮；删除 Save diagram 按钮 |
| **自动保存** | 重命名/新建/切换样例时静默保存；代码编辑器 10 秒无变更自动保存；Timeline 每分钟快照时同步保存；编辑器失焦触发保存 |
| **状态标识** | saving/saved/bookmarked/failed 标识；保存 <3 秒不显示 saving；成功类标识 3 秒淡出；移动端改为右下角条形通知 |
| **文本编辑器** | 移除 Config/doc 标签页，配置合并进 code 标签页（`---` 分隔符包围的 YAML frontmatter）；新增 Samples 面板（粉红分类小标题、样例按钮 flex 排列、代码一致时高亮样例） |
| **Projects 页面** | 更名为 Projects；搜索栏与导航栏基准线对齐；卡片改为渲染结果预览 + IntersectionObserver 懒加载；1:1 网格自适应列数（4K 横屏 5 列 / 竖屏 3 列） |
| **移动端** | 修复编辑/预览切换失效与代码编辑器行号配色问题 |

<!-- ## 3. 后续迭代规划 (v2.1+ / v3.0 Planning)

以下特性纳入后续版本迭代计划：

### 3.1 用户认证与多租户隔离 (v2.1)
- [ ] **用户认证体系**：支持 GitHub OAuth / OIDC 及本地 Token 登录鉴权。
- [ ] **多用户数据隔离**：项目关联 `user_id`，实现行级权限与隔离。
- [ ] **个性化设置**：自定义默认 Mermaid 主题、自动保存时间间隔等。

### 3.2 协作与分享 (v2.2)
- [ ] **公开分享链接**：一键生成只读分享链接（`/view/:shareToken`）。
- [ ] **项目分组与标签**：支持项目分类、标签筛选与文件夹组织。
- [ ] **增强导出**：支持批量一键导出（PNG、SVG、PDF、Markdown 压缩包）。

### 3.3 版本历史与高级特性 (v3.0)
- [ ] **版本历史与回滚**：自动保存历史快照，提供图形化版本对比与恢复。
- [ ] **服务端渲染 (SSR)**：提供服务端图表渲染接口（`/api/render`），便于 CI/CD 自动化调用生成图片。
- [ ] **云存储扩展**：支持 S3 兼容对象存储与数据库定时自动备份。
 -->

---

## 4. 历史记录查询
- 完整逐项任务清单请参阅：[docs/ROADMAP_ARCHIVE.md](docs/ROADMAP_ARCHIVE.md)。
