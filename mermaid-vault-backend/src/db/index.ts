import Database, { type Database as DatabaseType } from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

let dbInstance: DatabaseType | null = null;

export function getDB(customPath?: string): DatabaseType {
  if (dbInstance && !customPath) {
    return dbInstance;
  }

  const dbPath = customPath || process.env.DB_PATH || "./data/mermaid.db";
  const absoluteDbPath = path.isAbsolute(dbPath)
    ? dbPath
    : path.resolve(process.cwd(), dbPath);

  const dir = path.dirname(absoluteDbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(absoluteDbPath);
  db.pragma("journal_mode = WAL");

  // Run migrations in order
  const migrationsDir = path.resolve(process.cwd(), "migrations");
  if (fs.existsSync(migrationsDir)) {
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    for (const file of files) {
      const sqlPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(sqlPath, "utf-8");
      db.exec(sql);
    }

    // Ensure history_entries has project_id column and index
    try {
      const tableInfo = db.pragma("table_info(history_entries)") as { name: string }[];
      if (tableInfo.length > 0) {
        if (!tableInfo.some((col) => col.name === "project_id")) {
          db.exec("ALTER TABLE history_entries ADD COLUMN project_id TEXT;");
        }
        db.exec("CREATE INDEX IF NOT EXISTS idx_history_entries_project_id ON history_entries(project_id, time DESC);");
      }
    } catch {
      // Ignore if table does not exist
    }

    // Ensure preview columns exist on projects and history_entries (light/dark SVG + freshness hash)
    const previewColumns: [string, string][] = [
      ["preview_light_svg", "TEXT"],
      ["preview_light_hash", "TEXT"],
      ["preview_dark_svg", "TEXT"],
      ["preview_dark_hash", "TEXT"],
      ["preview_updated_at", "INTEGER"],
    ];
    for (const table of ["projects", "history_entries"]) {
      try {
        const info = db.pragma(`table_info(${table})`) as { name: string }[];
        if (info.length === 0) {
          continue;
        }
        for (const [column, type] of previewColumns) {
          if (!info.some((col) => col.name === column)) {
            db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type};`);
          }
        }
      } catch {
        // Ignore if table does not exist
      }
    }

    // Ensure projects have a workspace_id column (workspaces feature).
    // SQLite cannot ADD COLUMN IF NOT EXISTS, so guard via table_info.
    try {
      const projectInfo = db.pragma("table_info(projects)") as { name: string }[];
      if (projectInfo.length > 0 && !projectInfo.some((col) => col.name === "workspace_id")) {
        db.exec("ALTER TABLE projects ADD COLUMN workspace_id TEXT REFERENCES workspaces(id);");
        db.exec(
          "CREATE INDEX IF NOT EXISTS idx_projects_workspace_id ON projects(workspace_id, updated_at DESC);"
        );
        // Every project must belong to a workspace: assign strays to the oldest one
        db.exec(
          "UPDATE projects SET workspace_id = " +
          "(SELECT id FROM workspaces ORDER BY created_at ASC LIMIT 1) " +
          "WHERE workspace_id IS NULL AND EXISTS (SELECT 1 FROM workspaces);"
        );
      }
    } catch {
      // Ignore if table does not exist
    }

    // Ensure workspaces have a position column for manual (drag) ordering;
    // backfill newest-first to preserve the pre-ordering display order
    try {
      const wsInfo = db.pragma("table_info(workspaces)") as { name: string }[];
      if (wsInfo.length > 0 && !wsInfo.some((col) => col.name === "position")) {
        db.exec("ALTER TABLE workspaces ADD COLUMN position INTEGER;");
        db.exec(
          "UPDATE workspaces SET position = " +
          "(SELECT COUNT(*) FROM workspaces w2 " +
          "WHERE w2.created_at > workspaces.created_at " +
          "OR (w2.created_at = workspaces.created_at AND w2.rowid > workspaces.rowid));"
        );
      }
    } catch {
      // Ignore if table does not exist
    }
  }

  if (!customPath) {
    dbInstance = db;
  }
  return db;
}

export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}


