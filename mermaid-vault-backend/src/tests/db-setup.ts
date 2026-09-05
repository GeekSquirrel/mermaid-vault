import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Each test file gets its own throwaway SQLite database so tests never touch
// (or depend on the state of) the development database in ./data.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mermaid-vault-test-"));
process.env.DB_PATH = path.join(dir, "test.db");
