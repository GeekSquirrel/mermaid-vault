import { randomUUID } from "node:crypto";
import type {
  Express,
  Request,
  Response,
} from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { VaultApiClient } from "./apiClient.js";
import { resolveMcpConfig } from "./config.js";
import { createMcpServer } from "./server.js";

/**
 * Streamable-HTTP MCP endpoint mounted on the vault API server itself, for
 * remote MCP agents. Sessions live in memory (single-process deployment);
 * each session gets its own McpServer wired to a shared API client.
 */
export const MCP_HTTP_ROUTE = "/api/mcp";

interface McpHttpSession {
  transport: StreamableHTTPServerTransport;
  server: McpServer;
}

const jsonRpcError = (
  res: Response,
  status: number,
  code: number,
  message: string
): void => {
  res.status(status).json({
    jsonrpc: "2.0",
    error: { code, message },
    id: null,
  });
};

/**
 * Mounts POST/GET/DELETE handlers for the MCP endpoint. Must be called after
 * express.json() so req.body holds the parsed JSON-RPC message, and before
 * the 404 catch-all.
 *
 * @param fallbackApiBaseUrl base URL agents' rendered-image links and the
 *   tools use for API calls when MERMAID_VAULT_URL is unset; the in-process
 *   endpoint points at its own listener.
 */
export const registerMcpHttp = (app: Express, fallbackApiBaseUrl: string): void => {
  const config = resolveMcpConfig(fallbackApiBaseUrl);
  const client = new VaultApiClient({ baseUrl: config.apiBaseUrl });
  const sessions = new Map<string, McpHttpSession>();

  app.post(MCP_HTTP_ROUTE, (req: Request, res: Response) => {
    void (async () => {
      try {
        const header = req.headers["mcp-session-id"];
        const sessionId = typeof header === "string" ? header : undefined;
        let session = sessionId ? sessions.get(sessionId) : undefined;

        if (!session) {
          if (!isInitializeRequest(req.body)) {
            jsonRpcError(
              res,
              sessionId ? 404 : 400,
              sessionId ? -32001 : -32600,
              sessionId
                ? "Session not found"
                : "No valid MCP session: send an initialize request first"
            );
            return;
          }
          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            // Plain JSON responses keep the endpoint usable for simple HTTP
            // agents (curl, non-SSE clients); SSE stays available for
            // full-featured MCP clients.
            enableJsonResponse: true,
            onsessioninitialized: (id: string) => {
              sessions.set(id, { transport, server });
            },
          });
          const server = createMcpServer(client, config);
          transport.onclose = () => {
            const id = transport.sessionId;
            if (id) {
              sessions.delete(id);
            }
            void server.close();
          };
          await server.connect(transport);
          session = { transport, server };
        }

        await session.transport.handleRequest(req, res, req.body);
      } catch (error) {
        jsonRpcError(
          res,
          500,
          -32603,
          error instanceof Error ? error.message : "MCP endpoint error"
        );
      }
    })();
  });

  const withSession = (req: Request, res: Response): McpHttpSession | undefined => {
    const header = req.headers["mcp-session-id"];
    const sessionId = typeof header === "string" ? header : undefined;
    const session = sessionId ? sessions.get(sessionId) : undefined;
    if (!session) {
      jsonRpcError(
        res,
        sessionId ? 404 : 400,
        sessionId ? -32001 : -32600,
        sessionId ? "Session not found" : "Invalid or missing mcp-session-id header"
      );
    }
    return session;
  };

  // GET: server-to-client streams (SSE); DELETE: session termination.
  const getSession = (req: Request, res: Response) => {
    void (async () => {
      try {
        const session = withSession(req, res);
        if (session) {
          await session.transport.handleRequest(req, res);
        }
      } catch (error) {
        jsonRpcError(
          res,
          500,
          -32603,
          error instanceof Error ? error.message : "MCP endpoint error"
        );
      }
    })();
  };

  app.get(MCP_HTTP_ROUTE, getSession);
  app.delete(MCP_HTTP_ROUTE, getSession);
};
