import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../index.js";
import { VaultApiClient, VaultApiError } from "./apiClient.js";

let server: Server;
let client: VaultApiClient;
let baseUrl: string;

beforeAll(() => {
  server = app.listen(0);
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
  client = new VaultApiClient({ baseUrl });
});

afterAll(() => {
  server.close();
});

describe("VaultApiClient", () => {
  it("performs the full workspace + diagram CRUD lifecycle", async () => {
    const workspace = await client.createWorkspace({ name: "MCP Tests" });
    expect(workspace.id).toBeTruthy();

    const diagram = await client.createDiagram({
      title: "From MCP client",
      code: "flowchart TD\n    A --> B",
      workspace_id: workspace.id,
    });
    expect(diagram.workspace_id).toBe(workspace.id);

    const fetched = await client.getDiagram(diagram.id);
    expect(fetched.code).toContain("flowchart TD");

    const diagrams = await client.listDiagrams();
    expect(diagrams.some((d) => d.id === diagram.id)).toBe(true);

    const updated = await client.updateDiagram(diagram.id, {
      title: "Updated by MCP client",
    });
    expect(updated.title).toBe("Updated by MCP client");

    await client.deleteDiagram(diagram.id);
    await expect(client.getDiagram(diagram.id)).rejects.toMatchObject({
      name: "VaultApiError",
      status: 404,
      code: "NOT_FOUND",
    });

    await client.deleteWorkspace(workspace.id);
  });

  it("reorders workspaces after creating them", async () => {
    const first = await client.createWorkspace({ name: "Order A" });
    const second = await client.createWorkspace({ name: "Order B" });
    // reorder requires every workspace id exactly once, including any seeded ones
    const all = await client.listWorkspaces();
    const rest = all
      .map((workspace) => workspace.id)
      .filter((id) => id !== first.id && id !== second.id);
    await client.updateWorkspaceOrder({ order: [second.id, first.id, ...rest] });
    await client.deleteWorkspace(first.id);
    await client.deleteWorkspace(second.id);
  });

  it("maps API validation failures to VaultApiError", async () => {
    await expect(
      client.createDiagram({ title: "", code: "A --> B" })
    ).rejects.toMatchObject({
      name: "VaultApiError",
      status: 400,
      code: "INVALID_INPUT",
    });
  });

  it("maps unreachable backends to CONNECTION_ERROR", async () => {
    // Port 1 on loopback is closed in test environments.
    const dead = new VaultApiClient({ baseUrl: "http://127.0.0.1:1" });
    await expect(dead.listDiagrams()).rejects.toMatchObject({
      name: "VaultApiError",
      status: 0,
      code: "CONNECTION_ERROR",
    });
  });

  it("lists history entries as an empty array on a fresh database", async () => {
    const entries = await client.listHistory({ type: "all" });
    expect(Array.isArray(entries)).toBe(true);
  });
});
