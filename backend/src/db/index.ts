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


