import crypto from "node:crypto";
import { getDB } from "../db/index.js";
import type { CreateHistoryDto, HistoryEntry, UpdateHistoryDto } from "../types/index.js";

interface HistoryRow {
  id: string;
  project_id?: string | null;
  name: string;
  state: string;
  time: number;
  type: string;
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
    project_id: row.project_id || null,
    name: row.name,
    state: parsedState,
    time: row.time,
    type: row.type,
  };
}

export class HistoryModel {
  static getAll(type?: string, projectId?: string | null): HistoryEntry[] {
    const db = getDB();
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (type) {
      conditions.push("type = ?");
      params.push(type);
    }

    if (projectId !== undefined) {
      if (projectId === null || projectId === "default") {
        conditions.push("(project_id IS NULL OR project_id = 'default')");
      } else if (projectId !== "all") {
        conditions.push("project_id = ?");
        params.push(projectId);
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
    const projectId =
      data.projectId !== undefined
        ? data.projectId
        : data.project_id !== undefined
          ? data.project_id
          : null;
    const name = data.name.trim();
    const stateStr = JSON.stringify(data.state || {});
    const time = data.time !== undefined ? data.time : Date.now();
    const type = data.type || "manual";

    const stmt = db.prepare(
      "INSERT INTO history_entries (id, project_id, name, state, time, type) VALUES (?, ?, ?, ?, ?, ?)"
    );
    stmt.run(id, projectId, name, stateStr, time, type);

    return {
      id,
      project_id: projectId,
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
    const params: (string | number)[] = [];

    if (updates.name !== undefined) {
      setClauses.push("name = ?");
      params.push(updates.name.trim());
    }
    if (updates.state !== undefined) {
      setClauses.push("state = ?");
      params.push(JSON.stringify(updates.state));
    }
    if (updates.projectId !== undefined || updates.project_id !== undefined) {
      const pId = updates.projectId !== undefined ? updates.projectId : updates.project_id;
      setClauses.push("project_id = ?");
      params.push(pId ?? "");
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

  static clearAll(type?: string, projectId?: string | null): boolean {
    const db = getDB();
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (type) {
      conditions.push("type = ?");
      params.push(type);
    }

    if (projectId !== undefined) {
      if (projectId === null || projectId === "default") {
        conditions.push("(project_id IS NULL OR project_id = 'default')");
      } else if (projectId !== "all") {
        conditions.push("project_id = ?");
        params.push(projectId);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const sql = `DELETE FROM history_entries ${whereClause}`;
    const stmt = db.prepare(sql);
    stmt.run(...params);
    return true;
  }
}
