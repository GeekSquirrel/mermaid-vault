import crypto from "node:crypto";
import { getDB } from "../db/index.js";
import { codeHash } from "../util/hash.js";
import { WorkspaceModel } from "./WorkspaceModel.js";
import type { PreviewSvg, PreviewTheme, Diagram } from "../types/index.js";

export class DiagramModel {
  static getAll(): Diagram[] {
    const db = getDB();
    const stmt = db.prepare("SELECT * FROM diagrams ORDER BY updated_at DESC");
    return stmt.all() as Diagram[];
  }

  static getById(id: string): Diagram | null {
    const db = getDB();
    const stmt = db.prepare("SELECT * FROM diagrams WHERE id = ?");
    const result = stmt.get(id) as Diagram | undefined;
    return result || null;
  }

  static create(title: string, code: string, workspaceId?: string | null): Diagram {
    const db = getDB();
    const id = crypto.randomUUID();
    const now = Date.now();
    const workspace_id = WorkspaceModel.ensureUsableWorkspace(workspaceId);

    const stmt = db.prepare(
      "INSERT INTO diagrams (id, title, code, workspace_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    );
    stmt.run(id, title, code, workspace_id, now, now);

    return {
      id,
      title,
      code,
      workspace_id,
      created_at: now,
      updated_at: now,
    };
  }

  static update(
    id: string,
    title?: string,
    code?: string,
    workspaceId?: string | null
  ): Diagram | null {
    const existing = DiagramModel.getById(id);
    if (!existing) {
      return null;
    }

    const updates: string[] = [];
    const params: (string | number)[] = [];

    if (title !== undefined) {
      updates.push("title = ?");
      params.push(title);
    }
    if (code !== undefined) {
      updates.push("code = ?");
      params.push(code);
    }
    if (workspaceId !== undefined) {
      updates.push("workspace_id = ?");
      params.push(WorkspaceModel.ensureUsableWorkspace(workspaceId));
    }

    if (updates.length === 0) {
      return existing;
    }

    const now = Date.now();
    updates.push("updated_at = ?");
    params.push(now);

    params.push(id);

    const db = getDB();
    const sql = `UPDATE diagrams SET ${updates.join(", ")} WHERE id = ?`;
    const stmt = db.prepare(sql);
    stmt.run(...params);

    return DiagramModel.getById(id);
  }

  static delete(id: string): boolean {
    const db = getDB();
    const deleteTx = db.transaction((diagramId: string) => {
      // 1. Cascade delete associated saved history entries
      db.prepare("DELETE FROM history_entries WHERE diagram_id = ?").run(diagramId);
      // 2. Delete the diagram
      const result = db.prepare("DELETE FROM diagrams WHERE id = ?").run(diagramId);
      return result.changes > 0;
    });

    return deleteTx(id);
  }

  /**
   * Return the stored preview SVG for the given theme, but only when it was
   * rendered from the diagram's current code (hash match). Otherwise null.
   */
  static getPreview(id: string, theme: PreviewTheme): PreviewSvg | null {
    const db = getDB();
    const row = db
      .prepare(
        `SELECT code, preview_${theme}_svg AS svg, preview_${theme}_hash AS hash FROM diagrams WHERE id = ?`
      )
      .get(id) as { code: string; svg: string | null; hash: string | null } | undefined;
    if (!row || !row.svg || !row.hash) {
      return null;
    }
    if (codeHash(row.code) !== row.hash) {
      return null;
    }
    return { svg: row.svg, hash: row.hash };
  }

  /** Store the preview SVG only if codeHash still matches the diagram's current code. */
  static savePreview(id: string, theme: PreviewTheme, svg: string, hash: string): boolean {
    const db = getDB();
    const row = db.prepare("SELECT code FROM diagrams WHERE id = ?").get(id) as
      | { code: string }
      | undefined;
    if (!row) {
      return false;
    }
    if (codeHash(row.code) !== hash) {
      return false;
    }
    db.prepare(
      `UPDATE diagrams SET preview_${theme}_svg = ?, preview_${theme}_hash = ?, preview_updated_at = ? WHERE id = ?`
    ).run(svg, hash, Date.now(), id);
    return true;
  }
}


