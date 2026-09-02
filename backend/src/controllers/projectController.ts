import { ProjectModel } from "../models/ProjectModel.js";
import type { ApiResponse, Project } from "../types/index.js";

export class ProjectController {
  static listProjects(): { status: number; body: ApiResponse<Project[]> } {
    try {
      const projects = ProjectModel.getAll();
      return {
        status: 200,
        body: { success: true, data: projects },
      };
    } catch (err) {
      return {
        status: 500,
        body: {
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: err instanceof Error ? err.message : "Failed to fetch projects",
          },
        },
      };
    }
  }

  static getProject(id: string): { status: number; body: ApiResponse<Project> } {
    try {
      const project = ProjectModel.getById(id);
      if (!project) {
        return {
          status: 404,
          body: {
            success: false,
            error: { code: "NOT_FOUND", message: `Project with id ${id} not found` },
          },
        };
      }
      return {
        status: 200,
        body: { success: true, data: project },
      };
    } catch (err) {
      return {
        status: 500,
        body: {
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: err instanceof Error ? err.message : "Failed to get project",
          },
        },
      };
    }
  }

  static createProject(
    title: string,
    code: string
  ): { status: number; body: ApiResponse<Project> } {
    try {
      if (!title || typeof title !== "string") {
        return {
          status: 400,
          body: {
            success: false,
            error: { code: "INVALID_INPUT", message: "Title is required and must be a string" },
          },
        };
      }
      if (code === undefined || code === null || typeof code !== "string") {
        return {
          status: 400,
          body: {
            success: false,
            error: { code: "INVALID_INPUT", message: "Code must be a string" },
          },
        };
      }

      const project = ProjectModel.create(title.trim(), code);
      return {
        status: 201,
        body: { success: true, data: project },
      };
    } catch (err) {
      return {
        status: 500,
        body: {
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: err instanceof Error ? err.message : "Failed to create project",
          },
        },
      };
    }
  }

  static updateProject(
    id: string,
    title?: string,
    code?: string
  ): { status: number; body: ApiResponse<Project> } {
    try {
      const existing = ProjectModel.getById(id);
      if (!existing) {
        return {
          status: 404,
          body: {
            success: false,
            error: { code: "NOT_FOUND", message: `Project with id ${id} not found` },
          },
        };
      }

      const updated = ProjectModel.update(id, title?.trim(), code);
      if (!updated) {
        return {
          status: 404,
          body: {
            success: false,
            error: { code: "NOT_FOUND", message: `Project with id ${id} not found` },
          },
        };
      }

      return {
        status: 200,
        body: { success: true, data: updated },
      };
    } catch (err) {
      return {
        status: 500,
        body: {
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: err instanceof Error ? err.message : "Failed to update project",
          },
        },
      };
    }
  }

  static deleteProject(id: string): { status: number; body: ApiResponse<{ deleted: boolean }> } {
    try {
      const success = ProjectModel.delete(id);
      if (!success) {
        return {
          status: 404,
          body: {
            success: false,
            error: { code: "NOT_FOUND", message: `Project with id ${id} not found` },
          },
        };
      }
      return {
        status: 200,
        body: { success: true, data: { deleted: true } },
      };
    } catch (err) {
      return {
        status: 500,
        body: {
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: err instanceof Error ? err.message : "Failed to delete project",
          },
        },
      };
    }
  }
}

