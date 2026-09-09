# Mermaid Vault MCP 服务器 — AI Agent 使用指南

[English](mcp.md) | 简体中文

Mermaid Vault 后端内置了 **MCP（Model Context Protocol）服务器**，用于封装 Vault 的 REST API，让 AI Agent（ZCode、Claude Desktop、Cursor 或任意 MCP 客户端）能够代替用户保存、整理、渲染和分享 mermaid 图表。

提供两种传输方式：

| 传输方式 | 端点 / 命令 | 典型场景 |
|---|---|---|
| **stdio** | 在 `mermaid-vault-backend/` 下执行 `pnpm mcp`（或 `node dist/mcp/stdio.js`） | 以子进程方式拉起服务器的本地 Agent |
| **Streamable HTTP** | `http://<backend-host>:8080/api/mcp` | 远程 Agent，或通过 HTTP 而非子进程通信的 Agent |

两种传输方式暴露相同的 15 个工具和相同的使用说明。错误以 `isError` 工具结果返回，并附带 Vault 错误码（`NOT_FOUND`、`INVALID_INPUT`、`RENDER_UNAVAILABLE`、`CONNECTION_ERROR` 等）。

---

## 1. 启用 MCP 服务器

### 1.1 stdio（本地 Agent）

需要先启动后端（MCP 服务器通过 HTTP 代理它）：

```bash
cd mermaid-vault-backend
pnpm dev            # API 监听 :8080
```

然后在客户端中注册 MCP 服务器。常见配置：

**Claude Desktop**（`claude_desktop_config.json`）：

```json
{
  "mcpServers": {
    "mermaid-vault": {
      "command": "node",
      "args": ["/绝对路径/mermaid-vault-backend/dist/mcp/stdio.js"],
      "env": {
        "MERMAID_VAULT_URL": "http://127.0.0.1:8080",
        "MERMAID_VAULT_FRONTEND_URL": "http://localhost:3000"
      }
    }
  }
}
```

**ZCode / Cursor / 通用**（`.mcp.json`）：

```json
{
  "mcpServers": {
    "mermaid-vault": {
      "command": "pnpm",
      "args": ["--dir", "/绝对路径/mermaid-vault-backend", "mcp"],
      "env": {
        "MERMAID_VAULT_URL": "http://127.0.0.1:8080"
      }
    }
  }
}
```

> 开发阶段可以用 `pnpm mcp:dev`（tsx，无需构建）代替编译版 `pnpm mcp`。生产使用前记得先执行 `pnpm build` 以生成 `dist/mcp/stdio.js`。

### 1.2 Streamable HTTP（远程 Agent）

该端点默认挂载在 API 服务器上的 **`/api/mcp`** 路径，无需额外进程：

```bash
curl -X POST http://localhost:8080/api/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"my-agent","version":"1.0"}}}'
```

响应头中包含 `mcp-session-id`。后续每个请求（`tools/list`、`tools/call`，以及关闭会话的 `DELETE /api/mcp`）都需要带上它。端点返回纯 JSON 响应（同时也接受 SSE）。

设置 `MCP_ENABLED=false` 可禁用该端点（见第 4 节）。

> **安全提示**：MCP 端点与它封装的 REST API 一样没有鉴权。如果后端暴露在 localhost 之外，请通过支持鉴权的反向代理保护 `/api/mcp`（和 `/api`），或直接禁用该端点。

---

## 2. 环境变量

| 变量 | 使用方 | 默认值 | 说明 |
|---|---|---|---|
| `MERMAID_VAULT_URL` | stdio + HTTP | `http://127.0.0.1:8080`（stdio）/ 自身监听地址（HTTP） | 工具调用的 Vault REST API 基础地址 |
| `MERMAID_VAULT_FRONTEND_URL` | stdio + HTTP | `http://localhost:3000` | 用于构造查看/编辑分享链接的前端基础地址 |
| `MCP_ENABLED` | API 服务器 | `true` | 设为 `false` 可移除 `/api/mcp` 端点 |

---

## 3. 工具参考

### 图表（Diagrams）

| 工具 | 参数 | 说明 |
|---|---|---|
| `list_diagrams` | — | 列出所有已保存图表（id、标题、所属工作区、时间戳；不含 mermaid 源码） |
| `get_diagram` | `id` | 获取单个图表，包含 mermaid `code` 源码 |
| `create_diagram` | `title`、`code`、`workspace_id?` | 保存新图表；无效的 workspace id 会自动回退到默认工作区 |
| `update_diagram` | `id`、`title?`、`code?`、`workspace_id?` | 更新图表；仅修改传入的字段 |
| `delete_diagram` | `id` | 永久删除图表（**破坏性**） |
| `get_diagram_preview` | `id`、`theme?`（`light`/`dark`，默认 `light`） | 返回浏览器渲染的缓存 SVG 预览；缺失或过期时报 `NOT_FOUND` |

### 工作区（Workspaces）

| 工具 | 参数 | 说明 |
|---|---|---|
| `list_workspaces` | — | 列出工作区（仪表板上分组图表的文件夹） |
| `create_workspace` | `name`（1–100 字符） | 创建工作区 |
| `rename_workspace` | `id`、`name` | 重命名工作区 |
| `delete_workspace` | `id` | 删除工作区（**破坏性**） |
| `reorder_workspaces` | `order`（全部工作区 id，每个恰好一次） | 设置显示顺序 |

### 编辑器历史（只读）

| 工具 | 参数 | 说明 |
|---|---|---|
| `list_history` | `type?`（`manual`/`auto`/`loader`/`all`，默认 `all`）、`diagram_id?` | 列出 Web 应用记录的编辑快照 |
| `get_history` | `id` | 获取单条快照；`state.code` 为当时的 mermaid 源码 |

### 渲染与分享

| 工具 | 参数 | 说明 |
|---|---|---|
| `render_diagram` | `code`、`config?`（JSON 字符串）、`format?`（`svg`/`png`，默认 `svg`）、`scale?`（1–4） | 通过 API 服务器上的无头 Chromium 渲染；返回 SVG 文本或 PNG 图片。会校验代码——语法错误在此暴露。服务器缺少 Chromium 时报 `RENDER_UNAVAILABLE` |
| `build_diagram_links` | `code`、`mermaidConfig?`（JSON 字符串） | 立即把代码编码为 Vault 状态串，返回 `view_url`、`edit_url`、`svg_url`、`png_url`、`markdown_image`——无需渲染 |

---

## 4. 典型 Agent 工作流

**"帮我保存这张图"**
1. 先 `list_workspaces`，没有合适的工作区就 `create_workspace`。
2. `create_diagram`（传入标题、mermaid 代码和 `workspace_id`）。
3. `build_diagram_links` 把查看/编辑/图片链接交还用户。

**"给我看看这张图"**
1. 首选 `render_diagram`（返回真实 SVG/PNG，并校验语法）。
2. 若返回 `RENDER_UNAVAILABLE`，改用 `build_diagram_links`，分享 `svg_url`/`png_url`/`view_url`。

**"帮我改一下这张图"**
1. `get_diagram` → 修改 `code` → `update_diagram`。
2. 用 `render_diagram` 或 `build_diagram_links` 展示结果。

---

## 5. 故障排查

| 现象 | 原因与处理 |
|---|---|
| 工具返回 `CONNECTION_ERROR` | API 服务器未启动，或 `MERMAID_VAULT_URL` 端口不对。用 `pnpm dev` / `pnpm start` 启动 |
| `render_diagram` 返回 `RENDER_UNAVAILABLE` | API 服务器上没有 Chromium。安装 Chromium 或设置 `CHROMIUM_PATH`（见后端 README） |
| `build_diagram_links` 生成的链接指向错误主机 | 调整 `MERMAID_VAULT_FRONTEND_URL`（页面链接）和 `MERMAID_VAULT_URL`（图片链接） |
| HTTP 端点返回 400 "No valid MCP session" | 先发送 `initialize`，之后每个请求都带上 `mcp-session-id` 请求头 |
| `/api/mcp` 返回 404 | 端点被禁用（`MCP_ENABLED=false`），或后端构建产物早于 MCP 功能——执行 `pnpm build` 重新构建 |
