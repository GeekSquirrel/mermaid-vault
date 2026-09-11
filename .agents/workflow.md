# Agent 工作流程指导

> 根 `AGENTS.md`「工作流程速记」的详细版本。冲突时以本文件为准；硬性边界以根 `AGENTS.md` 为准。

## 1. 执行模型

- 每个对话同步执行：**默认在且仅在一个基于最新 `main` 的独立 worktree 中完成一个任务**（用户另有要求除外）。
- 一个任务 = 一个 worktree + 一个分支：分支 `<type>/<slug>`，目录 `../mermaid-vault-<slug>`。
- 多个对话并行时，因 worktree 与分支各自独立而天然隔离；严禁共用工作区或在其中来回切换分支。

## 2. 任务受理与分类

- 提交类型遵循 Conventional Commits，按任务语义自动匹配：`feat` `fix` `docs` `style` `refactor` `perf` `test` `chore` `ci` `build` `revert`。
- 破坏性变更（不兼容 API）：类型/范围后加 `!`（如 `feat(api)!: …`）或脚注 `BREAKING CHANGE: <描述>`；本项目要求 API 向后兼容，破坏性变更先经用户确认。
- 分支前缀与类型一致（如 `feat/env-management`）；兼容别名 `feature/` ≡ `feat/`、`bugfix/` ≡ `fix/`；特殊分支 `hotfix/<描述>`（线上紧急修复，类型 `fix`）、`release/<版本号>`（发布准备，类型 `chore`/`docs`）。

## 3. Worktree 生命周期

1. **创建**（在主工作区先 `git checkout main && git pull origin main`）：

   ```bash
   git worktree add -b <type>/<slug> ../mermaid-vault-<slug> main
   cd ../mermaid-vault-<slug>
   git submodule update --init && pnpm install && cp .env.example .env
   ```
2. **开发与自测**：所有修改与 commit 均在 worktree 内进行；`git worktree list` 可查看各工作区对应关系。
3. **推送与合并**：按第 5 节模式执行；PR 指向 `main`，CI 检查全部通过后以 merge commit 合并（`gh pr create` + `gh pr merge --merge`）。
4. **合并后必须清理**（先移除 worktree 再删分支；删除前确认无未推送提交）：

   ```bash
   git worktree remove ../mermaid-vault-<slug>   # 拒绝执行时确认可丢弃后加 --force
   git worktree prune
   git branch -d <type>/<slug>
   git push origin --delete <type>/<slug>        # 远程分支仍在时
   ```

## 4. 子模块细则

- 每个 worktree 的子模块 gitdir 相互独立（位于主仓库 `.git/worktrees/<name>/modules/`），可各自检出不同 commit/分支；worktree 内切换主仓库分支后需 `git submodule update` 同步指针。
- 严禁跨 worktree 共享子模块目录或 `node_modules`（包括软链接）；后端 `data/` 数据库同样按 worktree 隔离。
- 前端子模块：在 `packages/mermaid-vault-frontend/` 内提交并推送到自己的 fork（严禁动官方 upstream），回主仓库 `git add packages/mermaid-vault-frontend` 更新指针。

## 5. 审批模式

- **标准模式（默认）**：推送/合并前必须获得用户明确批准。批准后执行：`git push -u origin <type>/<slug>` → `gh pr create` → `gh pr checks --watch` 等 CI 通过 → `gh pr merge --merge` → 按第 3 节清理。
- **全自动模式**：仅当用户明确声明全自动运行时启用，仅限当次任务——自动连续执行上述全套流程（可用 `gh pr merge --auto` 自动合并），完成后汇报完整结果。
- 共同边界：严禁绕过分支保护（禁止 `--admin`）；CI 失败时自动修复重试或上报原因。

## 6. 计划与沟通

- 以 Anytype `mermaid-vault` 空间的 Tasks 集合为任务唯一来源（访问方式见 `.agents/anytype.md`），按里程碑顺序推进；完成自测后将对应 Task 的 Status 标记为 `Done`。
- 每完成 1~2 个任务点主动简报进展，展示关键命令输出；遇到模糊需求或技术决策时给出选项请用户选择，不擅自假设。
