# 贡献指南

[English](CONTRIBUTING.md) | 简体中文

感谢您对带有 Bun.js 后端的 Mermaid Live Editor 项目做出贡献！请遵循以下开发规范以保持代码质量与文档的一致性。

---

## 1. 开发与 Git 工作流

- **分支管理**：
  - 主仓库管理项目根目录及 `backend/` 后端代码。
  - 前端作为 Git 子模块引入于 `mermaid-live-editor/`，指向您的 fork 仓库。
- **前端代码变更**：
  - 在 `mermaid-live-editor/` 子模块内进行修改。
  - 在 `mermaid-live-editor/` 内部的 `develop` 分支上提交代码。
  - 返回主仓库根目录，提交子模块指针更新（`git add mermaid-live-editor`）。
- **后端代码变更**：
  - 直接在 `backend/` 下进行修改，并在主仓库根目录下提交。
- **Git 提交信息规范**：
  - 格式：`<type>(<scope>): <subject>`
  - Type 类别：`feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
  - Scope 作用域：`backend`, `frontend`, `submodule`, `docs`, `docker`
  - 示例：`feat(backend): add health check endpoint`

---

## 2. 双语文档同步机制

所有项目文档均需同时提供**英文**与**简体中文**双语版本：
- 根目录文档：`README.md`（英文）↔ `README.zh.md`（中文）
- 后端文档：`backend/README.md`（英文）↔ `backend/README.zh.md`（中文）
- 贡献指南：`CONTRIBUTING.md`（英文）↔ `CONTRIBUTING.zh.md`（中文）

任何对文档的新增、修改或删除，**必须同时更新对应的中英文版本**，确保内容与结构完全同步。

---

## 3. UI 国际化规范 (i18n)

- 前端所有用户可见文本必须与官方 `mermaid-live-editor` 上游原生风格保持一致。
- 所有新增的 UI 标签、状态提示（如 "Saving...", "Saved"）、输入占位符和错误信息必须使用规范的纯英文。
- 严禁在前端源代码中硬编码非英文文本。

---

## 4. 代码质量与测试要求

- **后端代码**：
  - 启用 TypeScript 严格模式 (`strict: true`)。
  - 使用 `bun test` 或手动接口调用验证所有 REST API 端点。
- **前端代码**：
  - 确保类型检查通过（`pnpm run check` 或 `svelte-check`）。
  - 确保生产打包顺利完成（`pnpm build`）。
- **Docker 容器**：
  - 验证 `docker compose build` 构建成功无报错。
