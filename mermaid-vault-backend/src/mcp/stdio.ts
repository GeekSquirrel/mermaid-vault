import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from "dotenv";
import { VaultApiClient } from "./apiClient.js";
import { resolveMcpConfig } from "./config.js";
import { createMcpServer } from "./server.js";

/**
 * MCP server entry point over stdio, for local MCP clients (ZCode, Claude
 * Desktop, Cursor, ...). The client spawns this process; all logging must
 * stay on stderr because stdout carries the JSON-RPC stream.
 */
const main = async (): Promise<void> => {
  dotenv.config();

  const config = resolveMcpConfig("http://127.0.0.1:8080");
  const client = new VaultApiClient({ baseUrl: config.apiBaseUrl });
  const server = createMcpServer(client, config);

  await server.connect(new StdioServerTransport());
  console.error(
    `[mermaid-vault-mcp] stdio server ready — proxying API at ${config.apiBaseUrl}`
  );
};

main().catch((error: unknown) => {
  console.error("[mermaid-vault-mcp] fatal:", error);
  process.exit(1);
});
