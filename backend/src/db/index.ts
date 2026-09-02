import { Database } from "bun:sqlite";
import fs from "node:fs";
import path from "node:path";

let dbInstance: Database | null = null;

export function getDB(): Database {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = process.env.DB_PATH || "./data/mermaid.db";
  const absoluteDbPath = path.isAbsolute(dbPath)
    ? dbPath
    : path.resolve(process.cwd(), dbPath);

  const dir = path.dirname(absoluteDbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  dbInstance = new Database(absoluteDbPath, { create: true });

  // Run initial migration
  const migrationPath = path.resolve(process.cwd(), "migrations/001_init.sql");
  if (fs.existsSync(migrationPath)) {
    const migrationSql = fs.readFileSync(migrationPath, "utf-8");
    dbInstance.run(migrationSql);
  }

  return dbInstance;
}
