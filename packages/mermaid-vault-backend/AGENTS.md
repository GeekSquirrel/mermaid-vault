# AGENTS.md – mermaid-vault-backend

后端子项目规则，补充根 `AGENTS.md`（冲突时以本文件为准）。环境搭建与 API 详情见本目录 `README.md`。

## 常用命令（在本目录执行）

| 用途 | 命令 | 说明 |
| --- | --- | --- |
| 本地开发 | `pnpm dev` | tsx watch，默认 `:8080` |
| 单元测试 | `pnpm test` | vitest，已禁用文件级并行 |
| 类型检查 | `pnpm exec tsc --noEmit` | 提交前必须通过 |
| 构建 | `pnpm build` | 输出到 `dist/` |
| 数据库迁移 | `pnpm migrate:up` | 执行 `migrations/` 下的迁移 |
| MCP 调试 | `pnpm mcp:dev` | stdio MCP，文档见根 `docs/mcp.md` |

仓库根的一体化命令走 Docker：`pnpm dev` / `pnpm test` / `pnpm migrate` / `pnpm test:frontend`（见根 `README.md`）。

## 结构与边界

- 分层：`src/routes` → `src/controllers` → `src/models`，横切逻辑放 `src/middleware`；DTO 统一放 `src/types/`。
- 数据库 `data/mermaid.db` 由 `migrations/` 初始化；`data/` 已加入 `.gitignore`，严禁提交数据库文件。
- 配置全部通过环境变量读取（模板 `.env.example`）；敏感信息不得写入代码或镜像。

## 代码规范

- TypeScript strict：函数显式参数与返回类型，禁用隐式 `any`。
- 错误响应统一 `{ success: false, error: { code, message } }`，异常用 `try/catch` 统一捕获。
- SQL 一律参数化查询；查询使用已有索引。
- 单元测试（vitest + supertest）至少覆盖 Repository/Controller 的 CRUD 核心路径。
- 日志：开发环境输出请求日志，生产环境仅记录错误。
