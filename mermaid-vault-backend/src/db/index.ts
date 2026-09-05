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

  // Rename the legacy `projects` table to `diagrams` (v2 naming). Must run
  // BEFORE the migration files so 001_init.sql does not create an empty
  // `diagrams` table that would block the rename; a no-op on fresh databases.
  try {
    const legacyProjects = db.pragma("table_info(projects)") as { name: string }[];
    const currentDiagrams = db.pragma("table_info(diagrams)") as { name: string }[];
    if (legacyProjects.length > 0 && currentDiagrams.length === 0) {
      db.exec("ALTER TABLE projects RENAME TO diagrams;");
      db.exec("DROP INDEX IF EXISTS idx_projects_updated_at;");
      db.exec("CREATE INDEX IF NOT EXISTS idx_diagrams_updated_at ON diagrams(updated_at DESC);");
      db.exec("DROP INDEX IF EXISTS idx_projects_workspace_id;");
      db.exec(
        "CREATE INDEX IF NOT EXISTS idx_diagrams_workspace_id ON diagrams(workspace_id, updated_at DESC);"
      );
    }
  } catch {
    // Ignore if table does not exist
  }

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

    // Ensure history_entries has diagram_id column and index; rename the
    // legacy project_id column in place when upgrading an existing database
    try {
      const tableInfo = db.pragma("table_info(history_entries)") as { name: string }[];
      if (tableInfo.length > 0) {
        if (!tableInfo.some((col) => col.name === "diagram_id")) {
          if (tableInfo.some((col) => col.name === "project_id")) {
            db.exec("ALTER TABLE history_entries RENAME COLUMN project_id TO diagram_id;");
          } else {
            db.exec("ALTER TABLE history_entries ADD COLUMN diagram_id TEXT;");
          }
        }
        db.exec("DROP INDEX IF EXISTS idx_history_entries_project_id;");
        db.exec("CREATE INDEX IF NOT EXISTS idx_history_entries_diagram_id ON history_entries(diagram_id, time DESC);");
      }
    } catch {
      // Ignore if table does not exist
    }

    // Ensure preview columns exist on diagrams and history_entries (light/dark SVG + freshness hash)
    const previewColumns: [string, string][] = [
      ["preview_light_svg", "TEXT"],
      ["preview_light_hash", "TEXT"],
      ["preview_dark_svg", "TEXT"],
      ["preview_dark_hash", "TEXT"],
      ["preview_updated_at", "INTEGER"],
    ];
    for (const table of ["diagrams", "history_entries"]) {
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

    // Ensure diagrams have a workspace_id column (workspaces feature).
    // SQLite cannot ADD COLUMN IF NOT EXISTS, so guard via table_info.
    try {
      const diagramInfo = db.pragma("table_info(diagrams)") as { name: string }[];
      if (diagramInfo.length > 0 && !diagramInfo.some((col) => col.name === "workspace_id")) {
        db.exec("ALTER TABLE diagrams ADD COLUMN workspace_id TEXT REFERENCES workspaces(id);");
        db.exec(
          "CREATE INDEX IF NOT EXISTS idx_diagrams_workspace_id ON diagrams(workspace_id, updated_at DESC);"
        );
        // Every diagram must belong to a workspace: assign strays to the oldest one
        db.exec(
          "UPDATE diagrams SET workspace_id = " +
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


