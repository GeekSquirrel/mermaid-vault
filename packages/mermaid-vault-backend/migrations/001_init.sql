CREATE TABLE IF NOT EXISTS diagrams (
    id TEXT PRIMARY KEY,                  -- UUID v4
    title TEXT NOT NULL,
    code TEXT NOT NULL,                   -- Mermaid 代码
    created_at INTEGER NOT NULL,          -- Unix 时间戳 (毫秒)
    updated_at INTEGER NOT NULL           -- Unix 时间戳 (毫秒)
);
CREATE INDEX IF NOT EXISTS idx_diagrams_updated_at ON diagrams(updated_at DESC);

