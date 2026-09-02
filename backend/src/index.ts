import { getDB } from "./db/index.js";
import { handleProjectsRoute } from "./routes/projects.js";

const PORT = Number(process.env.PORT) || 8080;

// Ensure database is initialized
getDB();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const server = Bun.serve({
  port: PORT,
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    let response: Response;

    // Health check
    if (url.pathname === "/health") {
      response = Response.json({ status: "ok" });
    } else if (url.pathname.startsWith("/api/projects")) {
      response = await handleProjectsRoute(req, url);
    } else {
      response = Response.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: `Path ${url.pathname} not found` },
        },
        { status: 404 }
      );
    }

    // Attach CORS headers to all responses
    for (const [key, value] of Object.entries(corsHeaders)) {
      response.headers.set(key, value);
    }

    return response;
  },
});

console.log(`Mermaid Editor Backend listening on http://localhost:${server.port}`);
