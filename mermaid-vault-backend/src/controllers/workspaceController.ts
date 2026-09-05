import type { Request, Response } from "express";
import { WorkspaceModel } from "../models/WorkspaceModel.js";
import type {
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  UpdateWorkspaceOrderDto,
} from "../types/index.js";

function validateName(name: unknown): string | null {
  if (!name || typeof name !== "string" || !name.trim()) {
    return "Workspace name is required and must be a non-empty string";
  }
  if (name.trim().length > 100) {
    return "Workspace name must be at most 100 characters";
  }
  return null;
}

export class WorkspaceController {
  static listWorkspaces(_req: Request, res: Response): void {
    try {
      const workspaces = WorkspaceModel.getAll();
      res.status(200).json({ success: true, data: workspaces });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to fetch workspaces",
        },
      });
    }
  }

  static getWorkspace(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_INPUT", message: "Workspace ID is required" },
        });
        return;
      }
      const workspace = WorkspaceModel.getById(id);
      if (!workspace) {
        res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: `Workspace with id ${id} not found` },
        });
        return;
      }
      res.status(200).json({ success: true, data: workspace });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to get workspace",
        },
      });
    }
  }

  static createWorkspace(req: Request, res: Response): void {
    try {
      const { name } = req.body as CreateWorkspaceDto;
      const nameError = validateName(name);
      if (nameError) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_INPUT", message: nameError },
        });
        return;
      }

      const workspace = WorkspaceModel.create(name.trim());
      res.status(201).json({ success: true, data: workspace });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to create workspace",
        },
      });
    }
  }

  static updateWorkspace(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_INPUT", message: "Workspace ID is required" },
        });
        return;
      }
      const { name } = req.body as UpdateWorkspaceDto;
      const nameError = validateName(name);
      if (nameError) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_INPUT", message: nameError },
        });
        return;
      }

      const workspace = WorkspaceModel.update(id, name.trim());
      if (!workspace) {
        res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: `Workspace with id ${id} not found` },
        });
        return;
      }
      res.status(200).json({ success: true, data: workspace });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to update workspace",
        },
      });
    }
  }

  static updateWorkspaceOrder(req: Request, res: Response): void {
    try {
      const { order } = req.body as UpdateWorkspaceOrderDto;
      if (!Array.isArray(order) || order.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: "order must be a non-empty array of workspace ids",
          },
        });
        return;
      }

      const existingIds = WorkspaceModel.getAll().map((w) => w.id);
      const unknown = order.filter((id) => !existingIds.includes(id));
      if (unknown.length > 0) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_INPUT", message: `Unknown workspace ids: ${unknown.join(", ")}` },
        });
        return;
      }
      if (
        order.length !== existingIds.length ||
        new Set(order).size !== order.length
      ) {
        res.status(400).json({
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: "order must contain every workspace id exactly once",
          },
        });
        return;
      }

      WorkspaceModel.updateOrder(order);
      res.status(200).json({ success: true, data: { updated: true } });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to update workspace order",
        },
      });
    }
  }

  static deleteWorkspace(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_INPUT", message: "Workspace ID is required" },
        });
        return;
      }
      if (!WorkspaceModel.getById(id)) {
        res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: `Workspace with id ${id} not found` },
        });
        return;
      }

      const success = WorkspaceModel.delete(id);
      res.status(200).json({ success: true, data: { deleted: success } });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to delete workspace",
        },
      });
    }
  }
}
