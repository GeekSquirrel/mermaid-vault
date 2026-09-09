import { createRequire } from "node:module";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { VaultApiClient } from "./apiClient.js";
import type { McpConfig } from "./config.js";
import { registerTools } from "./tools.js";

const require = createRequire(import.meta.url);

const serverVersion = (): string => {
  try {
    return require("../../package.json").version as string;
  } catch {
    return "0.0.0";
  }
};

/** Top-level guidance every MCP client receives alongside the tool list. */
const instructions = (config: McpConfig): string => `Mermaid Vault MCP server — save, organize, render and share mermaid diagrams.

Capabilities, by tool group:
- Diagrams (the saved mermaid sources): list_diagrams, get_diagram, create_diagram, update_diagram, delete_diagram, get_diagram_preview.
- Workspaces (folders grouping diagrams on the dashboard): list_workspaces, create_workspace, rename_workspace, delete_workspace, reorder_workspaces.
- Editor history (snapshots recorded by the web app; read-only here): list_history, get_history.
- Rendering & sharing: render_diagram (mermaid code -> SVG text / PNG image via headless Chromium), build_diagram_links (instant share/view/edit/image URLs encoded into the URL fragment).

Typical flows:
- "Save this diagram": create_diagram (optionally after create_workspace), then build_diagram_links so the user can open or share it.
- "Show me the diagram": prefer render_diagram; if Chromium rendering is unavailable on the server, fall back to build_diagram_links and share the URLs.
- "Change my diagram": get_diagram, edit the code, update_diagram, then render_diagram or build_diagram_links to show the result.

Notes:
- Mermaid source lives in the 'code' field; errors from the API arrive as isError results with a vault error code (NOT_FOUND, INVALID_INPUT, RENDER_UNAVAILABLE, CONNECTION_ERROR, ...).
- API base: ${config.apiBaseUrl} · frontend base (share links): ${config.frontendBaseUrl}`;

/**
 * Builds a fully-configured MCP server instance (tools + instructions) for
 * the vault. Callers own connecting it to a transport (stdio, streamable
 * HTTP, or an in-memory pair in tests).
 */
export const createMcpServer = (
  client: VaultApiClient,
  config: McpConfig
): McpServer => {
  const server = new McpServer(
    { name: "mermaid-vault", version: serverVersion() },
    { instructions: instructions(config) }
  );
  registerTools(server, client, config);
  return server;
};
