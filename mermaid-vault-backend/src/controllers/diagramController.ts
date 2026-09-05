import type { Request, Response } from "express";
import { DiagramModel } from "../models/DiagramModel.js";
import { WorkspaceModel } from "../models/WorkspaceModel.js";
import type { CreateDiagramDto, SavePreviewDto, UpdateDiagramDto } from "../types/index.js";
import { parsePreviewTheme, validateSavePreviewBody } from "../util/preview.js";

/** Returns an error message when the requested workspace does not exist; null otherwise. */
function validateWorkspaceId(workspaceId: string | null | undefined): string | null {
  if (workspaceId === undefined || workspaceId === null) {
    return null;
  }
  if (!WorkspaceModel.exists(workspaceId)) {
    return `Workspace with id ${workspaceId} not found`;
  }
  return null;
}

export class DiagramController {
  static listDiagrams(_req: Request, res: Response): void {
    try {
      const diagrams = DiagramModel.getAll();
      res.status(200).json({ success: true, data: diagrams });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to fetch diagrams",
        },
      });
    }
  }

  static getDiagram(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_INPUT", message: "Diagram ID is required" },
        });
        return;
      }
      const diagram = DiagramModel.getById(id);
      if (!diagram) {
        res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: `Diagram with id ${id} not found` },
        });
        return;
      }
      res.status(200).json({ success: true, data: diagram });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to get diagram",
        },
      });
    }
  }

  static createDiagram(req: Request, res: Response): void {
    try {
      const { title, code } = req.body as CreateDiagramDto;
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

      const { workspace_id } = req.body as CreateDiagramDto;
      // Unknown/stale workspace ids (e.g. a deleted workspace) fall back instead of failing
      const resolvedWorkspaceId = WorkspaceModel.ensureUsableWorkspace(workspace_id);

      const diagram = DiagramModel.create(title.trim(), code, resolvedWorkspaceId);
      res.status(201).json({ success: true, data: diagram });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to create diagram",
        },
      });
    }
  }

  static updateDiagram(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_INPUT", message: "Diagram ID is required" },
        });
        return;
      }
      const existing = DiagramModel.getById(id);
      if (!existing) {
        res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: `Diagram with id ${id} not found` },
        });
        return;
      }

      const { title, code, workspace_id } = req.body as UpdateDiagramDto;
      const workspaceError = validateWorkspaceId(workspace_id);
      if (workspaceError) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_INPUT", message: workspaceError },
        });
        return;
      }

      const updated = DiagramModel.update(id, title?.trim(), code, workspace_id);
      if (!updated) {
        res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: `Diagram with id ${id} not found` },
        });
        return;
      }

      res.status(200).json({ success: true, data: updated });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to update diagram",
        },
      });
    }
  }

  static deleteDiagram(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_INPUT", message: "Diagram ID is required" },
        });
        return;
      }
      const success = DiagramModel.delete(id);
      if (!success) {
        res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: `Diagram with id ${id} not found` },
        });
        return;
      }
      res.status(200).json({ success: true, data: { deleted: true } });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to delete diagram",
        },
      });
    }
  }

  static getDiagramPreview(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_INPUT", message: "Diagram ID is required" },
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
      const preview = DiagramModel.getPreview(id, theme);
      if (!preview) {
        res.status(404).json({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: `No fresh preview for diagram ${id} (missing or outdated)`,
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
          message: err instanceof Error ? err.message : "Failed to get diagram preview",
        },
      });
    }
  }

  static saveDiagramPreview(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_INPUT", message: "Diagram ID is required" },
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
      const saved = DiagramModel.savePreview(id, body.theme, body.svg, body.codeHash);
      if (!saved) {
        res.status(409).json({
          success: false,
          error: {
            code: "CONFLICT",
            message: `Preview rejected: diagram ${id} not found or code changed since render`,
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
          message: err instanceof Error ? err.message : "Failed to save diagram preview",
        },
      });
    }
  }
}


