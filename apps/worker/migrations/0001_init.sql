-- TNotes 初始化迁移
-- 说明：所有「人类可读内容」列均为密文（cipher + iv），服务端不做解析。

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notebooks (
  id         TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  cipher     TEXT NOT NULL,
  iv         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
  id         TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  cipher     TEXT NOT NULL,
  iv         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notes (
  id               TEXT PRIMARY KEY,
  created_at       INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL,
  deleted_at       INTEGER,
  favorited        INTEGER NOT NULL DEFAULT 0,
  notebook_id      TEXT,
  tag_ids          TEXT NOT NULL DEFAULT '[]',
  word_count       INTEGER NOT NULL DEFAULT 0,
  attachment_count INTEGER NOT NULL DEFAULT 0,
  cipher           TEXT NOT NULL,
  iv               TEXT NOT NULL,
  title_cipher     TEXT NOT NULL DEFAULT '',
  title_iv         TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_notebook ON notes (notebook_id);
CREATE INDEX IF NOT EXISTS idx_notes_deleted_at ON notes (deleted_at);

CREATE TABLE IF NOT EXISTS attachments (
  id         TEXT PRIMARY KEY,
  note_id    TEXT NOT NULL,
  mime       TEXT NOT NULL,
  size       INTEGER NOT NULL,
  salt       TEXT NOT NULL,
  iv         TEXT NOT NULL,
  chunk_count INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attachments_note ON attachments (note_id);

CREATE TABLE IF NOT EXISTS attachment_chunks (
  attachment_id TEXT NOT NULL,
  idx           INTEGER NOT NULL,
  data          BLOB NOT NULL,
  PRIMARY KEY (attachment_id, idx)
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at);

CREATE TABLE IF NOT EXISTS login_attempts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ip         TEXT NOT NULL,
  ok         INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts (ip, created_at);

