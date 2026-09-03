import crypto from "node:crypto";
import { getDB } from "../db/index.js";
import type { CreateHistoryDto, HistoryEntry, UpdateHistoryDto } from "../types/index.js";

interface HistoryRow {
  id: string;
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
    name: row.name,
    state: parsedState,
    time: row.time,
    type: row.type,
  };
}

export class HistoryModel {
  static getAll(type?: string): HistoryEntry[] {
    const db = getDB();
    if (type) {
      const stmt = db.prepare(
        "SELECT * FROM history_entries WHERE type = ? ORDER BY time DESC"
      );
      const rows = stmt.all(type) as HistoryRow[];
      return rows.map(rowToEntry);
    }
    const stmt = db.prepare("SELECT * FROM history_entries ORDER BY time DESC");
    const rows = stmt.all() as HistoryRow[];
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
    const name = data.name.trim();
    const stateStr = JSON.stringify(data.state || {});
    const time = data.time !== undefined ? data.time : Date.now();
    const type = data.type || "manual";

    const stmt = db.prepare(
      "INSERT INTO history_entries (id, name, state, time, type) VALUES (?, ?, ?, ?, ?)"
    );
    stmt.run(id, name, stateStr, time, type);

    return {
      id,
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

  static clearAll(type?: string): boolean {
    const db = getDB();
    if (type) {
      const stmt = db.prepare("DELETE FROM history_entries WHERE type = ?");
      stmt.run(type);
    } else {
      const stmt = db.prepare("DELETE FROM history_entries");
      stmt.run();
    }
    return true;
  }
}
