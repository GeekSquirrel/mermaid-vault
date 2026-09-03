import type { Request, Response } from "express";
import { HistoryModel } from "../models/HistoryModel.js";
import type { CreateHistoryDto, UpdateHistoryDto } from "../types/index.js";

export class HistoryController {
  static listHistory(req: Request, res: Response): void {
    try {
      const typeQuery = req.query.type;
      const type =
        typeof typeQuery === "string"
          ? typeQuery === "all"
            ? undefined
            : typeQuery
          : "manual";
      const entries = HistoryModel.getAll(type);
      res.status(200).json({ success: true, data: entries });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to fetch history",
        },
      });
    }
  }

  static getHistory(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_INPUT", message: "History entry ID is required" },
        });
        return;
      }
      const entry = HistoryModel.getById(id);
      if (!entry) {
        res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: `History entry with id ${id} not found` },
        });
        return;
      }
      res.status(200).json({ success: true, data: entry });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to get history entry",
        },
      });
    }
  }

  static createHistory(req: Request, res: Response): void {
    try {
      const { id, name, state, time, type } = req.body as CreateHistoryDto;
      if (!name || typeof name !== "string") {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_INPUT", message: "Name is required and must be a string" },
        });
        return;
      }
      if (!state || typeof state !== "object") {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_INPUT", message: "State is required and must be an object" },
        });
        return;
      }

      const entry = HistoryModel.create({
        id,
        name: name.trim(),
        state,
        time,
        type: type || "manual",
      });
      res.status(201).json({ success: true, data: entry });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to create history entry",
        },
      });
    }
  }

  static updateHistory(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_INPUT", message: "History entry ID is required" },
        });
        return;
      }
      const existing = HistoryModel.getById(id);
      if (!existing) {
        res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: `History entry with id ${id} not found` },
        });
        return;
      }

      const { name, state } = req.body as UpdateHistoryDto;
      const updated = HistoryModel.update(id, { name, state });
      if (!updated) {
        res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: `History entry with id ${id} not found` },
        });
        return;
      }

      res.status(200).json({ success: true, data: updated });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to update history entry",
        },
      });
    }
  }

  static deleteHistory(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: { code: "INVALID_INPUT", message: "History entry ID is required" },
        });
        return;
      }
      const success = HistoryModel.delete(id);
      if (!success) {
        res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: `History entry with id ${id} not found` },
        });
        return;
      }
      res.status(200).json({ success: true, data: { deleted: true } });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to delete history entry",
        },
      });
    }
  }

  static clearHistory(req: Request, res: Response): void {
    try {
      const typeQuery = req.query.type;
      const type =
        typeof typeQuery === "string"
          ? typeQuery === "all"
            ? undefined
            : typeQuery
          : "manual";
      HistoryModel.clearAll(type);
      res.status(200).json({ success: true, data: { cleared: true } });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to clear history",
        },
      });
    }
  }
}
