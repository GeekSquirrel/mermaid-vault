import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { getDB } from "./db/index.js";
import { historyRouter } from "./routes/history.js";
import { diagramRouter } from "./routes/diagrams.js";
import { workspaceRouter } from "./routes/workspaces.js";

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

// Start listening if not running under test runner
if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
  app.listen(PORT, () => {
    console.log(`Mermaid Vault Backend listening on http://localhost:${PORT}`);
  });
}


