CREATE TABLE IF NOT EXISTS history_entries (
    id TEXT PRIMARY KEY,                  -- UUID v4
    name TEXT NOT NULL,                   -- 条目名称/标题
    state TEXT NOT NULL,                  -- Mermaid 完整状态 JSON 字符串 (包含 code, mermaid 配置等)
    time INTEGER NOT NULL,                -- Unix 时间戳 (毫秒)
    type TEXT NOT NULL DEFAULT 'manual'   -- 类型 ('manual' / 'auto')
);
CREATE INDEX IF NOT EXISTS idx_history_entries_time ON history_entries(time DESC);
