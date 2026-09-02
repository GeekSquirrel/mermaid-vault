import type { Request, Response } from "express";
import { ProjectModel } from "../models/ProjectModel.js";
import type { CreateProjectDto, UpdateProjectDto } from "../types/index.js";

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
}


