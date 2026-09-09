import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../index.js";
import { findChromiumPath } from "../util/renderer.js";
import { VaultApiClient } from "./apiClient.js";
import { DEFAULT_FRONTEND_BASE_URL } from "./config.js";
import { createMcpServer } from "./server.js";

const EXPECTED_TOOLS = [
  "list_diagrams",
  "get_diagram",
  "create_diagram",
  "update_diagram",
  "delete_diagram",
  "get_diagram_preview",
  "list_workspaces",
  "create_workspace",
  "rename_workspace",
  "delete_workspace",
  "reorder_workspaces",
  "list_history",
  "get_history",
  "render_diagram",
  "build_diagram_links",
];

const textOf = (result: CallToolResult): string => {
  const first = result.content[0];
  if (!first || first.type !== "text") {
    throw new Error(`Expected text content, got ${first?.type ?? "none"}`);
  }
  return first.text;
};

let server: Server;
let client: Client;
let mcpServer: ReturnType<typeof createMcpServer>;
let baseUrl: string;

beforeAll(async () => {
  server = app.listen(0);
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;

  mcpServer = createMcpServer(new VaultApiClient({ baseUrl }), {
    apiBaseUrl: baseUrl,
    frontendBaseUrl: DEFAULT_FRONTEND_BASE_URL,
  });
  client = new Client({ name: "mcp-vitest", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([
    client.connect(clientTransport),
    mcpServer.connect(serverTransport),
  ]);
});

afterAll(() => {
  server.close();
  void client.close();
});

describe("mermaid-vault MCP server", () => {
  it("exposes one tool per wrapped API capability", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((tool) => tool.name).sort();
    expect(names).toEqual([...EXPECTED_TOOLS].sort());
  });

  it("sends usage instructions alongside the tool list", () => {
    const instructions = client.getInstructions() ?? "";
    expect(instructions).toContain("Mermaid Vault");
    expect(instructions).toContain("create_diagram");
    expect(instructions).toContain(baseUrl);
  });

  it("creates, reads and deletes a diagram through the tools", async () => {
    const created = await client.callTool({
      name: "create_diagram",
      arguments: { title: "MCP tool diagram", code: "flowchart LR\n    A --> B" },
    });
    expect(created.isError).toBeFalsy();
    const diagram = JSON.parse(textOf(created as CallToolResult));
    expect(diagram.id).toBeTruthy();

    const got = await client.callTool({
      name: "get_diagram",
      arguments: { id: diagram.id },
    });
    expect(JSON.parse(textOf(got as CallToolResult)).code).toContain("flowchart");

    const listed = await client.callTool({ name: "list_diagrams", arguments: {} });
    expect(textOf(listed as CallToolResult)).toContain("MCP tool diagram");

    const removed = await client.callTool({
      name: "delete_diagram",
      arguments: { id: diagram.id },
    });
    expect(removed.isError).toBeFalsy();

    const missing = await client.callTool({
      name: "get_diagram",
      arguments: { id: diagram.id },
    });
    expect(missing.isError).toBe(true);
    expect(textOf(missing as CallToolResult)).toContain("NOT_FOUND");
  });

  it("reports schema validation failures as tool errors", async () => {
    const result = await client.callTool({
      name: "create_diagram",
      arguments: { code: "A --> B" },
    });
    expect(result.isError).toBe(true);
  });

  it("builds share links without hitting the renderer", async () => {
    const result = await client.callTool({
      name: "build_diagram_links",
      arguments: { code: "flowchart TD\n    A --> B" },
    });
    expect(result.isError).toBeFalsy();
    const links = JSON.parse(textOf(result as CallToolResult));
    expect(links.state).toMatch(/^pako:[A-Za-z0-9_-]+$/);
    expect(links.view_url).toBe(`${DEFAULT_FRONTEND_BASE_URL}/view#${links.state}`);
    expect(links.edit_url).toContain("/diagram#pako:");
    expect(links.svg_url).toBe(`${baseUrl}/api/render/svg/${links.state}`);
    expect(links.png_url).toContain("type=png");
    expect(links.markdown_image).toContain(`](${links.view_url})`);
  });

  it("renders a diagram or degrades to a clear error without Chromium", async () => {
    const result = await client.callTool({
      name: "render_diagram",
      arguments: { code: "flowchart TD\n    A --> B" },
    });
    if (findChromiumPath()) {
      expect(result.isError).toBeFalsy();
      expect(textOf(result as CallToolResult)).toContain("<svg");
    } else {
      expect(result.isError).toBe(true);
      expect(textOf(result as CallToolResult)).toContain("RENDER_UNAVAILABLE");
    }
  });
});
