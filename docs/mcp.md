# Mermaid Vault MCP Server — AI Agent Usage Guide

[简体中文](mcp.zh.md) | English

The Mermaid Vault backend ships with a built-in **MCP (Model Context Protocol) server** that wraps the vault REST API, so AI agents (ZCode, Claude Desktop, Cursor, or any MCP client) can save, organize, render and share mermaid diagrams on the user's behalf.

Two transports are available:

| Transport | Endpoint / command | Typical use |
|---|---|---|
| **stdio** | `pnpm mcp` (or `node dist/mcp/stdio.js`) in `packages/mermaid-vault-backend/` | Local agents that spawn the server as a subprocess |
| **Streamable HTTP** | `http://<backend-host>:8080/api/mcp` | Remote agents, or agents that speak HTTP instead of spawning processes |

Both transports expose the same 15 tools and the same usage instructions. Errors arrive as `isError` tool results with a vault error code (`NOT_FOUND`, `INVALID_INPUT`, `RENDER_UNAVAILABLE`, `CONNECTION_ERROR`, ...).

---

## 1. Enabling the MCP Server

### 1.1 stdio (local agents)

The backend must be running first (the MCP server proxies it over HTTP):

```bash
cd packages/mermaid-vault-backend
pnpm dev            # API on :8080
```

Then register the MCP server with your client. Common configurations:

**Claude Desktop** (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "mermaid-vault": {
      "command": "node",
      "args": ["/absolute/path/to/packages/mermaid-vault-backend/dist/mcp/stdio.js"],
      "env": {
        "MERMAID_VAULT_URL": "http://127.0.0.1:8080",
        "MERMAID_VAULT_FRONTEND_URL": "http://localhost:8081"
      }
    }
  }
}
```

**ZCode / Cursor / generic** (`.mcp.json`):

```json
{
  "mcpServers": {
    "mermaid-vault": {
      "command": "pnpm",
      "args": ["--dir", "/absolute/path/to/packages/mermaid-vault-backend", "mcp"],
      "env": {
        "MERMAID_VAULT_URL": "http://127.0.0.1:8080"
      }
    }
  }
}
```

> During development you can use `pnpm mcp:dev` (tsx, no build step) instead of the compiled `pnpm mcp`. Remember to run `pnpm build` once so `dist/mcp/stdio.js` exists for production use.

### 1.2 Streamable HTTP (remote agents)

The endpoint is mounted on the API server by default at **`/api/mcp`** — no extra process needed:

```bash
curl -X POST http://localhost:8080/api/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"my-agent","version":"1.0"}}}'
```

The response includes an `mcp-session-id` header. Send it back on every subsequent request (`tools/list`, `tools/call`, and `DELETE /api/mcp` to close the session). Plain JSON responses are returned (SSE is also accepted).

Set `MCP_ENABLED=false` to disable the endpoint (see §4).

> **Security**: the MCP endpoint is unauthenticated, exactly like the REST API it wraps. If the backend is reachable from outside localhost, protect `/api/mcp` (and `/api`) with a reverse proxy that enforces authentication, or disable the endpoint.

---

## 2. Environment Variables

| Variable | Used by | Default | Description |
|---|---|---|---|
| `MERMAID_VAULT_URL` | stdio + HTTP | `http://127.0.0.1:8080` (stdio) / own listener (HTTP) | Base URL of the vault REST API the tools call |
| `MERMAID_VAULT_FRONTEND_URL` | stdio + HTTP | `http://localhost:8081` | Frontend base URL used to build view/edit share links |
| `MCP_ENABLED` | API server | `true` | Set to `false` to remove the `/api/mcp` endpoint |

---

## 3. Tool Reference

### Diagrams

| Tool | Parameters | Description |
|---|---|---|
| `list_diagrams` | — | List all saved diagrams (ids, titles, workspaces, timestamps; no mermaid source) |
| `get_diagram` | `id` | Fetch one diagram including its mermaid `code` |
| `create_diagram` | `title`, `code`, `workspace_id?` | Save a new diagram. Unknown workspace ids fall back to the default workspace |
| `update_diagram` | `id`, `title?`, `code?`, `workspace_id?` | Update a diagram; only provided fields change |
| `delete_diagram` | `id` | Permanently delete a diagram (**destructive**) |
| `get_diagram_preview` | `id`, `theme?` (`light`/`dark`, default `light`) | Return the cached browser-rendered SVG preview; errors `NOT_FOUND` when missing/stale |

### Workspaces

| Tool | Parameters | Description |
|---|---|---|
| `list_workspaces` | — | List workspaces (folders grouping diagrams on the dashboard) |
| `create_workspace` | `name` (1–100 chars) | Create a workspace |
| `rename_workspace` | `id`, `name` | Rename a workspace |
| `delete_workspace` | `id` | Delete a workspace (**destructive**) |
| `reorder_workspaces` | `order` (all workspace ids, once each) | Set the display order |

### Editor history (read-only)

| Tool | Parameters | Description |
|---|---|---|
| `list_history` | `type?` (`manual`/`auto`/`loader`/`all`, default `all`), `diagram_id?` | List editor snapshots recorded by the web app |
| `get_history` | `id` | Fetch one snapshot; `state.code` holds the mermaid source |

### Rendering & sharing

| Tool | Parameters | Description |
|---|---|---|
| `render_diagram` | `code`, `config?` (JSON string), `format?` (`svg`/`png`, default `svg`), `scale?` (1–4) | Render via headless Chromium on the API server; returns SVG text or a PNG image. Validates the code — syntax errors surface here. Requires Chromium on the server, otherwise errors `RENDER_UNAVAILABLE` |
| `build_diagram_links` | `code`, `mermaidConfig?` (JSON string) | Instantly encode the code into the vault state string and return `view_url`, `edit_url`, `svg_url`, `png_url`, `markdown_image` — no rendering involved |

---

## 4. Typical Agent Workflows

**"Save this diagram for me"**
1. `create_workspace` if a matching workspace doesn't exist (`list_workspaces` first).
2. `create_diagram` with title, mermaid code and `workspace_id`.
3. `build_diagram_links` to hand back view/edit/image URLs.

**"Show me the diagram"**
1. `render_diagram` (preferred: returns real SVG/PNG and validates syntax).
2. If `RENDER_UNAVAILABLE`, fall back to `build_diagram_links` and share `svg_url`/`png_url`/`view_url`.

**"Change my diagram"**
1. `get_diagram` → edit `code` → `update_diagram`.
2. `render_diagram` or `build_diagram_links` to show the result.

---

## 5. Troubleshooting

| Symptom | Cause & fix |
|---|---|
| Tools return `CONNECTION_ERROR` | The API server isn't running, or `MERMAID_VAULT_URL` points to the wrong port. Start it with `pnpm dev` / `pnpm start` |
| `render_diagram` returns `RENDER_UNAVAILABLE` | No Chromium on the API server. Install Chromium or set `CHROMIUM_PATH` (see backend README) |
| `build_diagram_links` URLs open the wrong host | Adjust `MERMAID_VAULT_FRONTEND_URL` (frontend links) and `MERMAID_VAULT_URL` (image links) |
| HTTP endpoint answers 400 "No valid MCP session" | Send `initialize` first, then pass the `mcp-session-id` header on every request |
| 404 on `/api/mcp` | The endpoint is disabled (`MCP_ENABLED=false`) or the backend build predates MCP support — rebuild with `pnpm build` |
