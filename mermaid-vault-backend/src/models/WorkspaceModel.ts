import crypto from "node:crypto";
import { getDB } from "../db/index.js";
import type { Workspace } from "../types/index.js";

export class WorkspaceModel {
  static getAll(): Workspace[] {
    const db = getDB();
    const stmt = db.prepare(
      "SELECT * FROM workspaces ORDER BY position ASC, created_at DESC, rowid ASC"
    );
    return stmt.all() as Workspace[];
  }

  /** Id of the earliest-created workspace; independent of the manual display order. */
  static getOldestId(): string | null {
    const db = getDB();
    const row = db
      .prepare("SELECT id FROM workspaces ORDER BY created_at ASC, rowid ASC LIMIT 1")
      .get() as { id: string } | undefined;
    return row?.id ?? null;
  }

  static getById(id: string): Workspace | null {
    const db = getDB();
    const stmt = db.prepare("SELECT * FROM workspaces WHERE id = ?");
    const result = stmt.get(id) as Workspace | undefined;
    return result || null;
  }

  static exists(id: string): boolean {
    return WorkspaceModel.getById(id) !== null;
  }

  static create(name: string): Workspace {
    const db = getDB();
    const id = crypto.randomUUID();
    const now = Date.now();
    // New workspaces appear at the top of the manual ordering
    const row = db.prepare("SELECT MIN(position) AS min FROM workspaces").get() as {
      min: number | null;
    };
    const position = (row.min ?? 0) - 1;

    const stmt = db.prepare(
      "INSERT INTO workspaces (id, name, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    );
    stmt.run(id, name, position, now, now);

    return { id, name, position, created_at: now, updated_at: now };
  }

  /** Persist a manual ordering: positions are assigned by list index. */
  static updateOrder(ids: string[]): void {
    const db = getDB();
    const update = db.prepare("UPDATE workspaces SET position = ? WHERE id = ?");
    const tx = db.transaction((orderedIds: string[]) => {
      orderedIds.forEach((id, index) => update.run(index, id));
    });
    tx(ids);
  }

  static update(id: string, name: string): Workspace | null {
    const db = getDB();
    const result = db
      .prepare("UPDATE workspaces SET name = ?, updated_at = ? WHERE id = ?")
      .run(name, Date.now(), id);
    if (result.changes === 0) {
      return null;
    }
    return WorkspaceModel.getById(id);
  }

  /**
   * Resolve a workspace id for a new project: the preferred id when it exists,
   * otherwise the oldest remaining workspace, otherwise a brand-new workspace.
   * Guarantees every created project belongs to an existing workspace.
   */
  static ensureUsableWorkspace(preferredId?: string | null): string {
    if (preferredId && WorkspaceModel.exists(preferredId)) {
      return preferredId;
    }
    const oldest = WorkspaceModel.getOldestId();
    if (oldest) {
      return oldest;
    }
    return WorkspaceModel.create("My Workspace").id;
  }

  /**
   * Delete a workspace. Its projects move to the oldest remaining workspace.
   * When the last workspace is deleted, a fresh Default workspace is recreated
   * to hold its projects (or simply removed if it has no projects at all).
   */
  static delete(id: string): boolean {
    const db = getDB();
    const deleteTx = db.transaction((workspaceId: string) => {
      const remaining = db
        .prepare("SELECT id FROM workspaces WHERE id != ? ORDER BY created_at ASC LIMIT 1")
        .get(workspaceId) as { id: string } | undefined;

      const row = db
        .prepare("SELECT COUNT(*) AS count FROM projects WHERE workspace_id = ?")
        .get(workspaceId) as { count: number };

      if (remaining) {
        // Move the projects out first so the foreign key allows the delete
        db.prepare("UPDATE projects SET workspace_id = ? WHERE workspace_id = ?").run(
          remaining.id,
          workspaceId
        );
        db.prepare("DELETE FROM workspaces WHERE id = ?").run(workspaceId);
        return true;
      }

      if (row.count === 0) {
        // Last workspace without projects: the list is simply empty now
        db.prepare("DELETE FROM workspaces WHERE id = ?").run(workspaceId);
        return true;
      }

      // Last workspace still had projects: a new workspace takes them over
      const created = WorkspaceModel.create("My Workspace");
      db.prepare("UPDATE projects SET workspace_id = ? WHERE workspace_id = ?").run(
        created.id,
        workspaceId
      );
      db.prepare("DELETE FROM workspaces WHERE id = ?").run(workspaceId);
      return true;
    });
    return deleteTx(id);
  }

  /** Number of projects that belong to the given workspace. */
  static countProjects(id: string): number {
    const db = getDB();
    const row = db
      .prepare("SELECT COUNT(*) AS count FROM projects WHERE workspace_id = ?")
      .get(id) as { count: number };
    return row.count;
  }
}
