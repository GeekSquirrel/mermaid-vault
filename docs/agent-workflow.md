# Agent 工作流程指导

> 根 `AGENTS.md`「工作流程速记」的详细版本：语义分类、worktree 生命周期、子模块隔离、审批模式与排错。与根文件冲突时以本文件为准；全局硬边界以根 `AGENTS.md` 为准。

## 1. 总体执行流程

1. **读取计划**：开始前完整阅读 `ROADMAP.md`，理解里程碑与依赖；按顺序处理每个小节（如 `6.1.1`），完成自测后勾选对应 `[ ]`。
2. **任务受理与分类**：按第 2 节对任务语义自动分类，确定提交类型、分支名与 worktree 目录名。
3. **Worktree 隔离执行**：每个任务默认在独立 worktree 中完成全生命周期（见第 3 节）。
4. **提交与合并审批**：按第 5 节选择标准/全自动模式。
5. **汇报进度**：阶段切换时向用户总结已完成工作、当前状态、下一步计划及风险点。
6. **处理阻塞**：遇到技术难点或需用户决策时，立即停止并提问，等待指示后再继续。

## 2. 任务分类与命名规范（语义自动匹配）

每受理一个任务，Agent 必须根据任务语义自动匹配提交类型与分支命名，禁止创造规范之外的类型或前缀。

### 2.1 提交类型（Type）

基于约定式提交（Conventional Commits）规范及社区实践：

| 类型 (Type) | 描述 | 示例 |
| :--- | :--- | :--- |
| `feat` | **新功能（Feature）**：为代码库添加新功能。 | `feat(backend): 添加用户登录接口` |
| `fix` | **Bug 修复（Bug Fix）**：修复代码缺陷。 | `fix(backend): 修复 API 超时问题` |
| `docs` | **文档（Documentation）**：仅修改文档，如更新 README。 | `docs: 更新 API 文档` |
| `style` | **代码风格（Style）**：不影响代码逻辑的变更，如缩进、空格、分号。 | `style(frontend): 统一代码缩进` |
| `refactor` | **代码重构（Refactor）**：既非修复 bug 也非新增功能的内部结构改进。 | `refactor(backend): 简化请求验证逻辑` |
| `perf` | **性能优化（Performance）**：改进代码以提升性能。 | `perf(frontend): 优化图表渲染速度` |
| `test` | **测试（Test）**：添加、修改或删除测试用例。 | `test(backend): 为用户模块添加单元测试` |
| `chore` | **杂务/构建（Chore）**：构建流程、工具配置、依赖管理等非业务代码。 | `chore: 升级依赖版本` |
| `ci` | **持续集成（CI）**：修改 CI/CD 配置文件或脚本。 | `ci: 更新 GitHub Actions 工作流` |
| `build` | **构建系统（Build）**：修改影响项目构建或外部依赖的文件（如 Dockerfile、打包配置）。 | `build: 更新 Dockerfile 构建配置` |
| `revert` | **回滚（Revert）**：撤销之前的某次提交。 | `revert: 回滚 feat(backend): 添加用户登录接口` |

### 2.2 破坏性变更（BREAKING CHANGE）

包含不兼容 API 变更时（对应 SemVer 主版本号 MAJOR 更新），必须特殊标记：

- 在类型/范围后加 `!`，例如 `feat(api)!: 修改用户认证接口`；
- 或在提交脚注中包含 `BREAKING CHANGE: <描述>`，例如 `BREAKING CHANGE: 移除了对 Node 6 的支持`。

本项目要求 API 向后兼容，若任务涉及破坏性变更，必须先向用户报告确认后再实施。

### 2.3 分支命名

前缀与提交类型保持一致，格式 `<type>/<简短描述>`（小写单词 + 中划线，如 `feat/env-management`、`fix/preview-leak`）：

- 兼容别名：`feature/<功能名>` ≡ `feat/<功能名>`，`bugfix/<描述>` ≡ `fix/<描述>`；同一分支生命周期内保持一种写法，推荐直接使用类型前缀以便自动匹配。
- 特殊分支：`hotfix/<紧急修复描述>`（线上紧急修复，从最新 `main` 拉出，提交类型用 `fix`，优先处理与合并）、`release/<版本号>`（版本发布准备，提交类型用 `chore` 或 `docs`）。

### 2.4 worktree 目录命名

与分支一一对应：`../mermaid-vault-<slug>`，`<slug>` 为分支名去掉前缀的部分（`feat/env-management` → `../mermaid-vault-env-management`，`hotfix/api-timeout` → `../mermaid-vault-api-timeout`）。

## 3. Worktree 隔离生命周期（默认执行模式）

**每个任务默认在独立的 git worktree 中执行：一个任务 = 一个 worktree + 一个分支。** 多个 Agent 并行时因分支不同而天然物理隔离；Git 限制同一分支同时只能被一个 worktree 检出，严禁多个任务共用同一工作区或来回切换分支。

### 3.1 创建 worktree

```bash
# 在主工作区执行：先同步 main，再从最新 main 创建分支与独立工作区
git checkout main && git pull origin main
git worktree add -b <type>/<slug> ../mermaid-vault-<slug> main
cd ../mermaid-vault-<slug>
git submodule update --init   # 关键：新 worktree 不会自动初始化子模块，必须手动执行
pnpm install                  # node_modules 不共享：主仓库与子模块需各自安装依赖
cp .env.example .env          # .env 等本地配置不共享，需按 worktree 单独准备
```

### 3.2 开发与自测

所有代码修改、测试及本地 commit（格式 `<type>(<scope>): <subject>`，scope ∈ `backend | frontend | submodule | docs`）均在 worktree 内进行；期间可用 `git worktree list` 查看现存工作区与分支的对应关系。

### 3.3 推送与 PR 合并

按第 5 节执行模式处理——标准模式等待用户批准后执行，全自动模式直接连续执行。推送后创建 PR 指向 `main`，等待 CI 检查全部通过后以 merge commit 方式合并（`gh pr create` + `gh pr merge --merge`）。

### 3.4 自动清理（合并后必须执行）

PR 合并入 `main` 后，**必须删除该任务的 worktree 与分支**（在主工作区或另一 worktree 中执行，不能在待删除的 worktree 内部执行；必须先移除 worktree 再删分支，否则分支被占用无法删除）：

```bash
# 在主工作区执行（先切回并同步 main）
git checkout main && git pull origin main
# 删除前确认无未推送提交：git status 与 git log origin/<branch>..<branch>
git worktree remove ../mermaid-vault-<slug>          # 有未提交修改或未跟踪文件时会拒绝执行
git worktree remove --force ../mermaid-vault-<slug>  # 确认修改可丢弃后再强制删除
git worktree prune                                   # 清理失效的 worktree 元数据
git branch -d <type>/<slug>                          # 删除本地分叉分支（提示未合并时确认后可用 -D）
git push origin --delete <type>/<slug>               # 若远程分支未被自动删除
```

清理完成后，本地仅保留主工作区及仍在进行中的任务 worktree，向用户汇报合并结果后进入下一个任务。

## 4. Worktree 与子模块隔离细则

- 每个 worktree 的子模块拥有独立 gitdir（位于主仓库 `.git/worktrees/<name>/modules/`），可在不同 worktree 中将子模块检出为不同 commit/分支，互不干扰。
- 在 worktree 内切换主仓库分支后，需执行 `git submodule update` 使子模块与当前 gitlink 指针同步。
- **严禁**通过软链接等方式让多个 worktree 共享同一份子模块目录或 `node_modules`（会互相覆盖检出状态，导致冲突）。
- 后端数据库 `data/` 目录同样按 worktree 隔离，各工作区的测试数据不互通。

## 5. 执行模式与审批策略（标准 / 全自动）

仓库配置了 `main` 分支保护，严禁直推；**任何模式下都必须通过 PR 合并、等待 CI 通过，严禁绕过分支保护（禁止 `--admin` 强制合并）**。

### 5.1 标准模式（默认）

- 修改完成且自测通过后，向用户提交详细的变更总结与验证报告。
- **核心红线**：严禁在未获得用户明确批准前自动推送或合并代码，必须等待用户确认批准。
- 批准后执行：`git push -u origin <type>/<slug>` → `gh pr create` → 等待 CI 通过（`gh pr checks --watch`）→ `gh pr merge --merge` → 按 3.4 清理。

### 5.2 全自动模式（需用户明确开启）

- **触发条件**：仅当用户在任务指令中明确声明希望全自动运行（例如“全自动执行”“不用逐次确认，直接跑完整套流程”）时启用；仅对当次任务生效，不得默认延续到后续任务。
- **行为**：自动接管并连续执行：创建 worktree → 开发自测与 commit → 推送 → `gh pr create` → 等待 CI 通过（可用 `gh pr merge --auto` 自动合并）→ 清理 worktree 与分支。
- **边界**：不豁免 CI 与分支保护——CI 失败时自动修复重试或停止并汇报原因，严禁绕过检查；任务完成后仍必须汇报完整结果（合并的 PR、清理状态、遗留问题）。

## 6. 与用户沟通方式

- **主动**：每完成 1~2 个任务点，发送简短进度更新。
- **透明**：展示关键命令输出（如 `pnpm dev` 运行结果），便于用户验证。
- **清晰**：使用 Markdown 列出已完成和待完成项。
- **协作**：遇到模糊需求或技术决策，主动给出选项供用户选择，不擅自假设。

## 7. 代码变更管理

- **前端修改**：`packages/mermaid-vault-frontend/`（子模块）下的变更，需在子模块内部提交并推送到自己的 fork，严禁向官方 upstream 发 PR。
- **后端修改**：在主仓库 `packages/mermaid-vault-backend/` 内提交，与子模块分离。
- **子模块更新**：子模块有新提交后，回主仓库根目录执行 `git add packages/mermaid-vault-frontend` 更新指针。

## 8. 排错速查

| 问题场景 | 行动 |
|----------|------|
| **后端无法启动** | 检查端口占用、数据库路径权限、依赖是否完整；报告错误日志请用户协助。 |
| **前端构建失败** | 优先修正 TypeScript 错误；涉及第三方库版本时可锁定版本。 |
| **子模块操作混乱** | `git submodule status` 查看状态，必要时重新克隆或重置子模块。 |
| **CORS 报错** | 确认响应头含 `Access-Control-Allow-Origin` 且允许 `OPTIONS` 方法。 |
| **API 返回 404** | 检查路由前缀与路径拼接，用 `curl` 直接测试后端端点。 |
| **Docker 构建超时** | 检查网络，考虑国内镜像源或 `--network=host`。 |
| **Worktree 残留或无法删除** | `git worktree list` 排查；确认无未推送提交后 `git worktree remove --force`，再 `git worktree prune`。 |
