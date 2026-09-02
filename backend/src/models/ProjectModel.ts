import { getDB } from "../db/index.js";
import type { Project } from "../types/index.js";

export class ProjectModel {
  static getAll(): Project[] {
    const db = getDB();
    const stmt = db.prepare("SELECT * FROM projects ORDER BY updated_at DESC");
    return stmt.all() as Project[];
  }

  static getById(id: string): Project | null {
    const db = getDB();
    const stmt = db.prepare("SELECT * FROM projects WHERE id = ?");
    const result = stmt.get(id) as Project | null;
    return result || null;
  }

  static create(title: string, code: string): Project {
    const db = getDB();
    const id = crypto.randomUUID();
    const now = Date.now();

    const stmt = db.prepare(
      "INSERT INTO projects (id, title, code, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    );
    stmt.run(id, title, code, now, now);

    return {
      id,
      title,
      code,
      created_at: now,
      updated_at: now,
    };
  }

  static update(id: string, title?: string, code?: string): Project | null {
    const existing = ProjectModel.getById(id);
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

    if (updates.length === 0) {
      return existing;
    }

    const now = Date.now();
    updates.push("updated_at = ?");
    params.push(now);

    params.push(id);

    const db = getDB();
    const sql = `UPDATE projects SET ${updates.join(", ")} WHERE id = ?`;
    const stmt = db.prepare(sql);
    stmt.run(...params);

    return ProjectModel.getById(id);
  }

  static delete(id: string): boolean {
    const db = getDB();
    const stmt = db.prepare("DELETE FROM projects WHERE id = ?");
    const result = stmt.run(id);
    return result.changes > 0;
  }
}

