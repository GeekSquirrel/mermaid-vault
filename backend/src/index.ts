import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { getDB } from "./db/index.js";
import { historyRouter } from "./routes/history.js";
import { projectRouter } from "./routes/projects.js";

dotenv.config();

const PORT = Number(process.env.PORT) || 8080;

// Ensure database is initialized
getDB();

export const app: express.Express = express();


// Enable CORS with standard permissive policy for local & container environments
app.use(
  cors({
    origin: "*",
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

// Mount project REST routes (support both /api/projects and /projects)
app.use(["/api/projects", "/projects"], projectRouter);

// Mount history REST routes (support both /api/history and /history)
app.use(["/api/history", "/history"], historyRouter);

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
    console.log(`Mermaid Editor Backend listening on http://localhost:${PORT}`);
  });
}


