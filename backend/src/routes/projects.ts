import { ProjectController } from "../controllers/projectController.js";
import type { CreateProjectDto, UpdateProjectDto } from "../types/index.js";

export async function handleProjectsRoute(
  req: Request,
  url: URL
): Promise<Response> {
  const path = url.pathname;
  const method = req.method.toUpperCase();

  const pathParts = path.split("/").filter(Boolean);

  if (pathParts.length === 2 && pathParts[1] === "projects") {
    if (method === "GET") {
      const res = ProjectController.listProjects();
      return Response.json(res.body, { status: res.status });
    }

    if (method === "POST") {
      let body: CreateProjectDto;
      try {
        body = (await req.json()) as CreateProjectDto;
      } catch {
        return Response.json(
          {
            success: false,
            error: { code: "INVALID_JSON", message: "Failed to parse JSON body" },
          },
          { status: 400 }
        );
      }

      const res = ProjectController.createProject(body.title, body.code);
      return Response.json(res.body, { status: res.status });
    }
  }

  if (pathParts.length === 3 && pathParts[1] === "projects") {
    const id = pathParts[2]!;

    if (method === "GET") {
      const res = ProjectController.getProject(id);
      return Response.json(res.body, { status: res.status });
    }

    if (method === "PUT") {
      let body: UpdateProjectDto;
      try {
        body = (await req.json()) as UpdateProjectDto;
      } catch {
        return Response.json(
          {
            success: false,
            error: { code: "INVALID_JSON", message: "Failed to parse JSON body" },
          },
          { status: 400 }
        );
      }

      const res = ProjectController.updateProject(id, body.title, body.code);
      return Response.json(res.body, { status: res.status });
    }

    if (method === "DELETE") {
      const res = ProjectController.deleteProject(id);
      return Response.json(res.body, { status: res.status });
    }
  }

  return Response.json(
    {
      success: false,
      error: { code: "NOT_FOUND", message: `Route ${method} ${path} not found` },
    },
    { status: 404 }
  );
}

