-- Workspaces: user-defined diagram groups; all workspaces are equivalent.
-- A sample workspace is seeded on first initialization and can be renamed or
-- deleted like any other.
CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,                  -- UUID v4
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL,          -- Unix 时间戳 (毫秒)
    updated_at INTEGER NOT NULL           -- Unix 时间戳 (毫秒)
);

-- Seed a sample workspace only when the table is empty (first initialization)
INSERT INTO workspaces (id, name, created_at, updated_at)
SELECT
    lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' ||
    substr(lower(hex(randomblob(2))), 2) || '-' ||
    substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' ||
    lower(hex(randomblob(6))),
    'Sample Workspace',
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
WHERE NOT EXISTS (SELECT 1 FROM workspaces);
