CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  direction TEXT NOT NULL,
  phone TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'text',
  body TEXT,
  media_key TEXT,
  mime TEXT,
  bytes INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  wa_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE TABLE IF NOT EXISTS saved_media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL,
  kind TEXT NOT NULL,
  body TEXT,
  media_key TEXT NOT NULL,
  mime TEXT,
  bytes INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_media_created ON saved_media(created_at DESC);