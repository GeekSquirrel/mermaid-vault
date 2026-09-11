# AGENTS.md – Mermaid Vault

> 面向 AI 编程代理的索引与全局规则：只保留使命、高频流程速记与硬边界。详细流程、子项目规则、项目背景一律按下方索引查阅，不在本文件重复。

## 使命

以全栈专家身份推进 Mermaid Live Editor 持久化存储后端（v2）的开发。任务清单、里程碑顺序与完成标准以 Anytype `mermaid-vault` 空间的 **Tasks 集合**为唯一来源（完成自测后将对应 Task 的 Status 标记为 `Done`）。

## 信息源 SoT（Anytype）

Anytype MCP 的 `mermaid-vault` 空间是所有项目相关文档的唯一事实来源（SoT），MCP 使用经验见 `.agents/anytype.md`：

| 对象 | 角色 | 说明 |
| --- | --- | --- |
| **Wiki** 对象 | 项目开发文档来源 | 架构、技术决策、历史归档等；新开发文档用 `wiki` 类型创建并登记到「Wiki」根对象 |
| **Tasks** 集合 | RoadMap 来源 | Task 对象用 Status（`To Do` / `In Progress` / `Done`）管理；已完成的里程碑保留 `Done` 作为历史记录 |
| **General** 频道（chat） | 想法讨论来源 | 新想法先在此讨论，成熟后转入 Tasks 或 Wiki |

## 文档索引

| 需要了解 | 查看 |
| --- | --- |
| 任务清单、里程碑、完成标准 | Anytype `mermaid-vault` 空间 Tasks 集合（历史归档在空间 Wiki「Roadmap 历史归档」） |
| 启动、Docker、环境变量、API | `README.md` |
| 贡献与协作规范 | `CONTRIBUTING.md` |
| MCP 服务 | `docs/mcp.md` |
| **Agent 完整工作流**（分类表、worktree 生命周期、审批模式、子模块细则、排错） | `.agents/workflow.md` |
| Anytype MCP 使用经验 | `.agents/anytype.md` |
| 后端专属命令与规范 | `packages/mermaid-vault-backend/AGENTS.md` |

## 工作流程速记（详见 `.agents/workflow.md`）

1. **每个对话同步执行：默认在且仅在一个基于最新 `main` 的独立 worktree 中完成一个任务**（用户另有要求除外）。一个任务 = 一个 worktree + 一个分支，分支 `<type>/<slug>` 对应目录 `../mermaid-vault-<slug>`。
2. 受理任务先做语义分类：提交遵循 Conventional Commits（`feat` `fix` `docs` `style` `refactor` `perf` `test` `chore` `ci` `build` `revert`；破坏性变更加 `!` 或脚注 `BREAKING CHANGE:`）。
3. 创建与初始化（子模块不共享，必须手动初始化）：

   ```bash
   git worktree add -b <type>/<slug> ../mermaid-vault-<slug> main
   cd ../mermaid-vault-<slug>
   git submodule update --init && pnpm install && cp .env.example .env
   ```
4. 合并只走 PR 指向 `main`，等待 CI 检查全部通过。
5. **PR 合并后必须清理**（先移除 worktree 再删分支）：`git worktree remove ../mermaid-vault-<slug>` → `git worktree prune` → `git branch -d <type>/<slug>`（远程分支仍在则一并删除）。

## 审批模式

- **标准模式（默认）**：推送或合并前必须获得用户明确批准，严禁擅自推送或合并。
- **全自动模式**：仅当用户明确声明全自动运行时启用，仅限当次任务——自动完成推送 → PR → 等 CI → 合并 → 清理，事后汇报完整结果。
- 共同边界：严禁绕过分支保护（禁止 `--admin`）；CI 失败时修复或上报原因。

## 硬性边界（最常违反）

1. 严禁直推 `main`；严禁向官方 upstream 发 PR（子模块只提交到自己的 fork）。
2. 未经用户同意不修改 `.github/workflows/`。
3. 严禁跨 worktree 共享子模块目录或 `node_modules`（包括软链接）；切换分支后用 `git submodule update` 同步。
4. 不提交 `data/`、`mermaid.db`、`.env`；新配置一律走环境变量并提供 `.env.example`；新增依赖先评估必要性并锁定版本。
5. 子模块内提交后，回主仓库根目录 `git add packages/mermaid-vault-frontend` 更新指针。
6. 前端 UI 文字不得硬编码，遵循官方 i18n 策略（纯英文或翻译函数）。
7. API 保持向后兼容；破坏性变更必须先经用户确认并特殊标记。

## 提交信息与文档双语

- 提交格式 `<type>(<scope>): <subject>`，scope ∈ `backend | frontend | submodule | docs`。
- 用户可见文档（README / CONTRIBUTING / docs/mcp）改动必须中英双语同步；面向 Agent 的文档（`AGENTS.md`、`.agents/`）可仅中文。

**版本**：4.2
