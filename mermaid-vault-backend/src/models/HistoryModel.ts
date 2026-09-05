import crypto from "node:crypto";
import { getDB } from "../db/index.js";
import { codeHash } from "../util/hash.js";
import type {
  CreateHistoryDto,
  HistoryEntry,
  PreviewSvg,
  PreviewTheme,
  UpdateHistoryDto,
} from "../types/index.js";

interface HistoryRow {
  id: string;
  diagram_id?: string | null;
  name: string;
  state: string;
  time: number;
  type: string;
}

/** Extract the diagram code from a serialized state JSON; null when absent. */
function stateCode(stateJson: string): string | null {
  try {
    const state = JSON.parse(stateJson) as { code?: unknown };
    return typeof state.code === "string" ? state.code : null;
  } catch {
    return null;
  }
}

function rowToEntry(row: HistoryRow): HistoryEntry {
  let parsedState: Record<string, unknown> = {};
  try {
    parsedState = JSON.parse(row.state);
  } catch {
    parsedState = {};
  }
  return {
    id: row.id,
    diagram_id: row.diagram_id || null,
    name: row.name,
    state: parsedState,
    time: row.time,
    type: row.type,
  };
}

export class HistoryModel {
  static getAll(type?: string, diagramId?: string | null): HistoryEntry[] {
    const db = getDB();
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (type) {
      conditions.push("type = ?");
      params.push(type);
    }

    if (diagramId !== undefined) {
      if (!diagramId || diagramId === "default" || diagramId === "null") {
        conditions.push("(diagram_id IS NULL OR diagram_id = '' OR diagram_id = 'default')");
      } else if (diagramId !== "all") {
        conditions.push("diagram_id = ?");
        params.push(diagramId);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const sql = `SELECT * FROM history_entries ${whereClause} ORDER BY time DESC`;
    const stmt = db.prepare(sql);
    const rows = stmt.all(...params) as HistoryRow[];
    return rows.map(rowToEntry);
  }

  static getById(id: string): HistoryEntry | null {
    const db = getDB();
    const stmt = db.prepare("SELECT * FROM history_entries WHERE id = ?");
    const row = stmt.get(id) as HistoryRow | undefined;
    return row ? rowToEntry(row) : null;
  }

  static create(data: CreateHistoryDto): HistoryEntry {
    const db = getDB();
    const id = data.id || crypto.randomUUID();
    const diagramId =
      data.diagramId !== undefined
        ? data.diagramId
        : data.diagram_id !== undefined
          ? data.diagram_id
          : null;
    const name = data.name.trim();
    const stateStr = JSON.stringify(data.state || {});
    const time = data.time !== undefined ? data.time : Date.now();
    const type = data.type || "manual";

    const stmt = db.prepare(
      "INSERT INTO history_entries (id, diagram_id, name, state, time, type) VALUES (?, ?, ?, ?, ?, ?)"
    );
    stmt.run(id, diagramId, name, stateStr, time, type);

    return {
      id,
      diagram_id: diagramId,
      name,
      state: data.state || {},
      time,
      type,
    };
  }

  static update(id: string, updates: UpdateHistoryDto): HistoryEntry | null {
    const existing = HistoryModel.getById(id);
    if (!existing) {
      return null;
    }

    const setClauses: string[] = [];
    const params: (string | number | null)[] = [];

    if (updates.name !== undefined) {
      setClauses.push("name = ?");
      params.push(updates.name.trim());
    }
    if (updates.state !== undefined) {
      setClauses.push("state = ?");
      params.push(JSON.stringify(updates.state));
    }
    if (updates.diagramId !== undefined || updates.diagram_id !== undefined) {
      const pId = updates.diagramId !== undefined ? updates.diagramId : updates.diagram_id;
      setClauses.push("diagram_id = ?");
      params.push(pId || null);
    }

    if (setClauses.length === 0) {
      return existing;
    }

    params.push(id);

    const db = getDB();
    const sql = `UPDATE history_entries SET ${setClauses.join(", ")} WHERE id = ?`;
    const stmt = db.prepare(sql);
    stmt.run(...params);

    return HistoryModel.getById(id);
  }

  static delete(id: string): boolean {
    const db = getDB();
    const stmt = db.prepare("DELETE FROM history_entries WHERE id = ?");
    const result = stmt.run(id);
    return result.changes > 0;
  }

  static clearAll(type?: string, diagramId?: string | null): boolean {
    const db = getDB();
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (type) {
      conditions.push("type = ?");
      params.push(type);
    }

    if (diagramId !== undefined) {
      if (!diagramId || diagramId === "default" || diagramId === "null") {
        conditions.push("(diagram_id IS NULL OR diagram_id = '' OR diagram_id = 'default')");
      } else if (diagramId !== "all") {
        conditions.push("diagram_id = ?");
        params.push(diagramId);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const sql = `DELETE FROM history_entries ${whereClause}`;
    const stmt = db.prepare(sql);
    stmt.run(...params);
    return true;
  }

  /**
   * Return the stored preview SVG for the given theme, but only when it was
   * rendered from the entry's current state code (hash match). Otherwise null.
   */
  static getPreview(id: string, theme: PreviewTheme): PreviewSvg | null {
    const db = getDB();
    const row = db
      .prepare(
        `SELECT state, preview_${theme}_svg AS svg, preview_${theme}_hash AS hash FROM history_entries WHERE id = ?`
      )
      .get(id) as { state: string; svg: string | null; hash: string | null } | undefined;
    if (!row || !row.svg || !row.hash) {
      return null;
    }
    const code = stateCode(row.state);
    if (code === null || codeHash(code) !== row.hash) {
      return null;
    }
    return { svg: row.svg, hash: row.hash };
  }

  /** Store the preview SVG only if codeHash still matches the entry's current state code. */
  static savePreview(id: string, theme: PreviewTheme, svg: string, hash: string): boolean {
    const db = getDB();
    const row = db.prepare("SELECT state FROM history_entries WHERE id = ?").get(id) as
      | { state: string }
      | undefined;
    if (!row) {
      return false;
    }
    const code = stateCode(row.state);
    if (code === null || codeHash(code) !== hash) {
      return false;
    }
    db.prepare(
      `UPDATE history_entries SET preview_${theme}_svg = ?, preview_${theme}_hash = ?, preview_updated_at = ? WHERE id = ?`
    ).run(svg, hash, Date.now(), id);
    return true;
  }
}
