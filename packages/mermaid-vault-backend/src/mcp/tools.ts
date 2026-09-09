import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { VaultApiError, type VaultApiClient } from "./apiClient.js";
import type { McpConfig } from "./config.js";
import { encodeRenderState, encodeShareState } from "./state.js";

const jsonText = (value: unknown): string => JSON.stringify(value, null, 2);

const ok = (text: string): CallToolResult => ({
  content: [{ type: "text", text }],
});

const okJson = (value: unknown): CallToolResult => ok(jsonText(value));

/** Wraps handler failures into isError results agents can read and act on. */
const withErrors = (run: () => Promise<CallToolResult>): Promise<CallToolResult> =>
  run().catch((error: unknown): CallToolResult => {
    if (error instanceof VaultApiError) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Vault API error ${error.code} (HTTP ${error.status}): ${error.message}`,
          },
        ],
      };
    }
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Tool failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  });

/**
 * Registers every MCP tool on the server. Each tool wraps one or two vault
 * REST API endpoints; the descriptions double as the agent-facing usage
 * instructions and are kept in sync with docs/mcp.md.
 */
export const registerTools = (
  server: McpServer,
  client: VaultApiClient,
  config: McpConfig
): void => {
  // --- Diagrams ---

  server.registerTool(
    "list_diagrams",
    {
      title: "List saved diagrams",
      description:
        "List all diagrams saved in the Mermaid Vault. Returns id, title, workspace_id and timestamps for each diagram (mermaid source excluded — call get_diagram for it).",
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () =>
      withErrors(async () => okJson(await client.listDiagrams()))
  );

  server.registerTool(
    "get_diagram",
    {
      title: "Get a saved diagram",
      description:
        "Fetch one saved diagram by id, including its mermaid source in the `code` field.",
      inputSchema: {
        id: z.string().min(1).describe("Diagram id, as returned by list_diagrams"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ id }) => withErrors(async () => okJson(await client.getDiagram(id)))
  );

  server.registerTool(
    "create_diagram",
    {
      title: "Create a saved diagram",
      description:
        "Save a new mermaid diagram to the vault. `code` must be valid mermaid diagram syntax, e.g. 'flowchart TD\\n    A[Start] --> B[End]'. If workspace_id is omitted the diagram goes to the default workspace; unknown workspace ids fall back to the default workspace instead of failing. Returns the stored diagram with its id.",
      inputSchema: {
        title: z.string().min(1).describe("Human-readable diagram title"),
        code: z.string().min(1).describe("Mermaid diagram source code"),
        workspace_id: z
          .string()
          .optional()
          .describe("Workspace to file the diagram under (see list_workspaces)"),
      },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ title, code, workspace_id }) =>
      withErrors(async () =>
        okJson(
          await client.createDiagram({
            title,
            code,
            workspace_id: workspace_id ?? null,
          })
        )
      )
  );

  server.registerTool(
    "update_diagram",
    {
      title: "Update a saved diagram",
      description:
        "Update an existing diagram's title, mermaid code and/or workspace. Only the provided fields change. Use this after editing code so the saved diagram stays in sync.",
      inputSchema: {
        id: z.string().min(1).describe("Diagram id to update"),
        title: z.string().min(1).optional().describe("New diagram title"),
        code: z.string().min(1).optional().describe("New mermaid diagram source code"),
        workspace_id: z
          .string()
          .nullable()
          .optional()
          .describe("New workspace id (null moves the diagram to the default workspace)"),
      },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ id, title, code, workspace_id }) =>
      withErrors(async () =>
        okJson(await client.updateDiagram(id, { title, code, workspace_id }))
      )
  );

  server.registerTool(
    "delete_diagram",
    {
      title: "Delete a saved diagram",
      description:
        "Permanently delete a saved diagram from the vault. This cannot be undone.",
      inputSchema: {
        id: z.string().min(1).describe("Diagram id to delete"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: false,
      },
    },
    async ({ id }) =>
      withErrors(async () => {
        await client.deleteDiagram(id);
        return ok(`Diagram ${id} deleted.`);
      })
  );

  server.registerTool(
    "get_diagram_preview",
    {
      title: "Get a diagram's cached SVG preview",
      description:
        "Return the cached browser-rendered SVG preview of a saved diagram. The preview only exists after the web app rendered the current code version; when it is missing or stale the API replies NOT_FOUND — use render_diagram to render on demand instead.",
      inputSchema: {
        id: z.string().min(1).describe("Diagram id"),
        theme: z
          .enum(["light", "dark"])
          .default("light")
          .describe("Which theme variant of the preview to fetch"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ id, theme }) =>
      withErrors(async () => {
        const svg = await client.getDiagramPreviewSvg(id, theme);
        return ok(svg);
      })
  );

  // --- Workspaces ---

  server.registerTool(
    "list_workspaces",
    {
      title: "List workspaces",
      description:
        "List all workspaces. Workspaces are folders that group diagrams on the dashboard; diagrams carry a workspace_id referencing these ids.",
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => withErrors(async () => okJson(await client.listWorkspaces()))
  );

  server.registerTool(
    "create_workspace",
    {
      title: "Create a workspace",
      description:
        "Create a new workspace (a folder grouping diagrams on the dashboard). Name must be 1-100 characters.",
      inputSchema: {
        name: z.string().min(1).max(100).describe("Workspace display name"),
      },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ name }) =>
      withErrors(async () => okJson(await client.createWorkspace({ name })))
  );

  server.registerTool(
    "rename_workspace",
    {
      title: "Rename a workspace",
      description: "Rename an existing workspace.",
      inputSchema: {
        id: z.string().min(1).describe("Workspace id to rename"),
        name: z.string().min(1).max(100).describe("New workspace display name"),
      },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ id, name }) =>
      withErrors(async () =>
        okJson(await client.updateWorkspace(id, { name }))
      )
  );

  server.registerTool(
    "delete_workspace",
    {
      title: "Delete a workspace",
      description:
        "Delete a workspace. This cannot be undone; the API decides what happens to diagrams that referenced it.",
      inputSchema: {
        id: z.string().min(1).describe("Workspace id to delete"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: false,
      },
    },
    async ({ id }) =>
      withErrors(async () => {
        await client.deleteWorkspace(id);
        return ok(`Workspace ${id} deleted.`);
      })
  );

  server.registerTool(
    "reorder_workspaces",
    {
      title: "Reorder workspaces",
      description:
        "Set the display order of all workspaces. `order` must be a complete, deduplicated list of every workspace id in the desired sequence (fetch ids with list_workspaces first).",
      inputSchema: {
        order: z
          .array(z.string().min(1))
          .min(1)
          .describe("All workspace ids in the desired order"),
      },
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async ({ order }) =>
      withErrors(async () => {
        await client.updateWorkspaceOrder({ order });
        return ok("Workspace order updated.");
      })
  );

  // --- History ---

  server.registerTool(
    "list_history",
    {
      title: "List editor history entries",
      description:
        "List editor history entries (snapshots the web app records while editing). Each entry carries its id, name, diagram_id, timestamp, type and an opaque `state` object. Entries are read-only via MCP: they are managed by the web editor.",
      inputSchema: {
        type: z
          .enum(["manual", "auto", "loader", "all"])
          .default("all")
          .describe(
            "Which entry kinds to return: manual snapshots, auto saves, loader imports, or all of them"
          ),
        diagram_id: z
          .string()
          .optional()
          .describe("Only return entries belonging to this diagram id"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ type, diagram_id }) =>
      withErrors(async () =>
        okJson(await client.listHistory({ type, diagramId: diagram_id }))
      )
  );

  server.registerTool(
    "get_history",
    {
      title: "Get an editor history entry",
      description:
        "Fetch one history entry by id. `state.code` holds the mermaid source captured at that point — feed it to render_diagram or build_diagram_links to visualize or share it.",
      inputSchema: {
        id: z.string().min(1).describe("History entry id"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ id }) => withErrors(async () => okJson(await client.getHistory(id)))
  );

  // --- Rendering & sharing ---

  server.registerTool(
    "render_diagram",
    {
      title: "Render mermaid code to SVG or PNG",
      description:
        "Render mermaid diagram code into an actual image via headless Chromium on the API server. Returns SVG markup as text, or a PNG image. Unlike build_diagram_links this validates the code: syntax errors surface here. Rendering can take a few seconds; if the server lacks Chromium you get a RENDER_UNAVAILABLE error — fall back to build_diagram_links.",
      inputSchema: {
        code: z.string().min(1).describe("Mermaid diagram source code to render"),
        config: z
          .string()
          .optional()
          .describe(
            "Mermaid theme config as a JSON string, e.g. '{\"theme\":\"dark\"}'"
          ),
        format: z
          .enum(["svg", "png"])
          .default("svg")
          .describe("svg returns markup text; png returns an image"),
        scale: z
          .number()
          .int()
          .min(1)
          .max(4)
          .optional()
          .describe("PNG upscale factor (png only, default 2)"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ code, config, format, scale }) =>
      withErrors(async () => {
        const state = encodeRenderState(code, config);
        if (format === "png") {
          const image = await client.renderImage(state, { type: "png", scale });
          return {
            content: [
              {
                type: "image",
                data: image.base64,
                mimeType: image.contentType,
              } as const,
            ],
          };
        }
        const svg = await client.renderSvg(state);
        return ok(svg);
      })
  );

  server.registerTool(
    "build_diagram_links",
    {
      title: "Build shareable diagram links",
      description:
        "Encode mermaid code into the vault's self-contained state string and derive every shareable URL from it — no rendering needed, works instantly: view_url (read-only page), edit_url (editor preloaded with the code), svg_url / png_url (on-demand images served by the API, usable directly in Markdown <img>), and a ready-made markdown_image. Use this whenever the user wants to share or preview a diagram.",
      inputSchema: {
        code: z.string().min(1).describe("Mermaid diagram source code"),
        mermaidConfig: z
          .string()
          .optional()
          .describe("Mermaid theme config as a JSON string, e.g. '{\"theme\":\"dark\"}'"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ code, mermaidConfig }) =>
      withErrors(async () => {
        const state = encodeShareState(code, mermaidConfig);
        const viewUrl = `${config.frontendBaseUrl}/view#${state}`;
        const pngUrl = `${client.apiBaseUrl}/api/render/img/${state}?type=png&scale=2`;
        return okJson({
          state,
          view_url: viewUrl,
          edit_url: `${config.frontendBaseUrl}/diagram#${state}`,
          svg_url: `${client.apiBaseUrl}/api/render/svg/${state}`,
          png_url: pngUrl,
          markdown_image: `[![](${pngUrl})](${viewUrl})`,
        });
      })
  );
};
