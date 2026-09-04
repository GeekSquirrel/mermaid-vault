import type { Request, Response } from "express";
import { ProjectModel } from "../models/ProjectModel.js";
import type { CreateProjectDto, SavePreviewDto, UpdateProjectDto } from "../types/index.js";
import { parsePreviewTheme, validateSavePreviewBody } from "../util/preview.js";

export class ProjectController {
  static listProjects(_req: Request, res: Response): void {
    try {
      const projects = ProjectModel.getAll();
      res.status(200).json({ success: true, data: projects });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to fetch projects",
        },
      });
    }
  }

  static getProject(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_INPUT", message: "Project ID is required" },
        });
        return;
      }
      const project = ProjectModel.getById(id);
      if (!project) {
        res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: `Project with id ${id} not found` },
        });
        return;
      }
      res.status(200).json({ success: true, data: project });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to get project",
        },
      });
    }
  }

  static createProject(req: Request, res: Response): void {
    try {
      const { title, code } = req.body as CreateProjectDto;
      if (!title || typeof title !== "string") {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_INPUT", message: "Title is required and must be a string" },
        });
        return;
      }
      if (code === undefined || code === null || typeof code !== "string") {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_INPUT", message: "Code must be a string" },
        });
        return;
      }

      const project = ProjectModel.create(title.trim(), code);
      res.status(201).json({ success: true, data: project });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to create project",
        },
      });
    }
  }

  static updateProject(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_INPUT", message: "Project ID is required" },
        });
        return;
      }
      const existing = ProjectModel.getById(id);
      if (!existing) {
        res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: `Project with id ${id} not found` },
        });
        return;
      }

      const { title, code } = req.body as UpdateProjectDto;
      const updated = ProjectModel.update(id, title?.trim(), code);
      if (!updated) {
        res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: `Project with id ${id} not found` },
        });
        return;
      }

      res.status(200).json({ success: true, data: updated });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to update project",
        },
      });
    }
  }

  static deleteProject(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_INPUT", message: "Project ID is required" },
        });
        return;
      }
      const success = ProjectModel.delete(id);
      if (!success) {
        res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: `Project with id ${id} not found` },
        });
        return;
      }
      res.status(200).json({ success: true, data: { deleted: true } });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to delete project",
        },
      });
    }
  }

  static getProjectPreview(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_INPUT", message: "Project ID is required" },
        });
        return;
      }
      const theme = parsePreviewTheme(req.query.theme);
      if (!theme) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_INPUT", message: "Theme must be 'light' or 'dark'" },
        });
        return;
      }
      const preview = ProjectModel.getPreview(id, theme);
      if (!preview) {
        res.status(404).json({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: `No fresh preview for project ${id} (missing or outdated)`,
          },
        });
        return;
      }
      res
        .status(200)
        .set("Content-Type", "image/svg+xml")
        .set("ETag", `"${preview.hash}"`)
        .set("Cache-Control", "no-cache")
        .send(preview.svg);
    } catch (err) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to get project preview",
        },
      });
    }
  }

  static saveProjectPreview(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_INPUT", message: "Project ID is required" },
        });
        return;
      }
      const body = req.body as SavePreviewDto;
      const validationError = validateSavePreviewBody(body);
      if (validationError) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_INPUT", message: validationError },
        });
        return;
      }
      const saved = ProjectModel.savePreview(id, body.theme, body.svg, body.codeHash);
      if (!saved) {
        res.status(409).json({
          success: false,
          error: {
            code: "CONFLICT",
            message: `Preview rejected: project ${id} not found or code changed since render`,
          },
        });
        return;
      }
      res.status(200).json({ success: true, data: { saved: true } });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to save project preview",
        },
      });
    }
  }
}


