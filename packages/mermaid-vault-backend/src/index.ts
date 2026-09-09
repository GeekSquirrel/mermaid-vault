import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { getDB } from "./db/index.js";
import { historyRouter } from "./routes/history.js";
import { diagramRouter } from "./routes/diagrams.js";
import { workspaceRouter } from "./routes/workspaces.js";
import { renderRouter } from "./routes/render.js";
import { registerMcpHttp } from "./mcp/http.js";
import {
  RENDER_ASSETS_ROUTE,
  RENDER_PAGE_ROUTE,
  mermaidDistPath,
  renderPageHtml,
} from "./util/renderer.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "public");

dotenv.config();

const PORT = Number(process.env.PORT) || 8080;

// Ensure database is initialized
getDB();

export const app: express.Express = express();


// CORS policy: CORS_ORIGIN accepts a comma-separated origin whitelist.
// Defaults to "*" (permissive) — only set it when the frontend calls the API
// cross-origin (e.g. API_BASE_URL pointing to a standalone API domain).
// Same-origin proxying (vite dev proxy / nginx) never triggers CORS.
const CORS_ORIGIN = process.env.CORS_ORIGIN?.trim();
const corsOrigins: string[] | boolean = CORS_ORIGIN
  ? CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean)
  : true;

app.use(
  cors({
    origin: corsOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body parser (larger limit to accommodate preview SVG uploads)
app.use(express.json({ limit: "5mb" }));

// Express 5 compatibility: req.body is undefined (not {}) when no JSON body
// was parsed. Default it back to {} so controllers keep rejecting missing
// bodies with 400 INVALID_INPUT instead of crashing with a 500.
app.use((req: express.Request, _res: express.Response, next: express.NextFunction) => {
  if (req.body === undefined) {
    req.body = {};
  }
  next();
});

// Health check endpoint (support both /health and /api/health)
app.get(["/health", "/api/health"], (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// Mount diagram REST routes (support both /api/diagrams and /diagrams)
app.use(["/api/diagrams", "/diagrams"], diagramRouter);

// Mount history REST routes (support both /api/history and /history)
app.use(["/api/history", "/history"], historyRouter);

// Mount workspace REST routes (support both /api/workspaces and /workspaces)
app.use(["/api/workspaces", "/workspaces"], workspaceRouter);

// Mount diagram rendering routes (support both /api/render and /render)
app.use(["/api/render", "/render"], renderRouter);

// MCP (Model Context Protocol) endpoint over streamable HTTP, for remote AI
// agents. Opt out with MCP_ENABLED=false. Must stay before the 404 handler.
if (process.env.MCP_ENABLED !== "false") {
  registerMcpHttp(app, `http://127.0.0.1:${PORT}`);
}

// Internal renderer page + mermaid ESM bundle, consumed by headless Chromium
// during /api/render requests. Intentionally not under /api so the reverse
// proxy does not expose them publicly.
app.get(RENDER_PAGE_ROUTE, (_req, res) => {
  res.type("html").send(renderPageHtml());
});
app.use(RENDER_ASSETS_ROUTE, express.static(mermaidDistPath()));

// Static frontend hosting (Express hosts SPA in production when publicDir exists)
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));

  // Dynamic runtime frontend configuration
  app.get("/config.js", (_req, res) => {
    const apiBaseUrl =
      process.env.API_BASE_URL ||
      (process.env.BASE_URL ? `${process.env.BASE_URL.replace(/\/+$/, "")}/api` : "");
    res
      .type("application/javascript")
      .send(`window.APP_CONFIG = { apiBaseUrl: ${JSON.stringify(apiBaseUrl)} };`);
  });

  // SPA fallback for non-API GET routes (send index.html for client-side routing)
  app.use((req, res, next) => {
    if (req.method !== "GET") {
      return next();
    }
    if (
      req.path.startsWith("/api") ||
      req.path.startsWith("/health") ||
      req.path === RENDER_PAGE_ROUTE ||
      req.path.startsWith(RENDER_ASSETS_ROUTE)
    ) {
      return next();
    }
    const indexPath = path.join(publicDir, "index.html");
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    next();
  });
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Path ${req.path} not found`,
    },
  });
});

// Central error handling middleware
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: err.message || "An unexpected error occurred",
      },
    });
  }
);

// Start listening if not running under test runner.
// Express 5 passes listen errors (e.g. EADDRINUSE) to the callback instead of
// throwing, so they must be handled here explicitly.
if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
  app.listen(PORT, (error) => {
    if (error) {
      console.error(`Failed to listen on port ${PORT}:`, error);
      process.exit(1);
    }
    console.log(`Mermaid Vault Backend listening on http://localhost:${PORT}`);
  });
}


