-- SQLite schema for UX research repo demo
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  content TEXT NOT NULL,
  original_text TEXT,
  clean_text TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_favorite BOOLEAN DEFAULT 0,
  anonymization_profile_id TEXT,
  clean_version INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS note_tags (
  note_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (note_id, tag_id),
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- FTS virtual table mirroring notes
CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
  filename, content, content='notes', content_rowid='id'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
  INSERT INTO notes_fts(rowid, filename, content)
  VALUES (new.id, new.filename, new.content);
END;

CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
  INSERT INTO notes_fts(notes_fts, rowid, filename, content)
  VALUES('delete', old.id, old.filename, old.content);
END;

CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
  INSERT INTO notes_fts(notes_fts, rowid, filename, content)
  VALUES('delete', old.id, old.filename, old.content);
  INSERT INTO notes_fts(rowid, filename, content)
  VALUES (new.id, new.filename, new.content);
END;

-- Anonymization tables
CREATE TABLE IF NOT EXISTS anonymization_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  config TEXT NOT NULL, -- JSON config
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pseudonyms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pii_hash TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  label TEXT NOT NULL,
  first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS anonymization_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  profile_id TEXT NOT NULL,
  detector_version TEXT NOT NULL,
  summary TEXT NOT NULL, -- JSON summary
  duration_ms INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY (profile_id) REFERENCES anonymization_profiles(id) ON DELETE CASCADE
);

-- User preferences for onboarding and workflows
CREATE TABLE IF NOT EXISTS user_preferences (
  id INTEGER PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  role TEXT,
  preferred_workflows TEXT, -- JSON array
  last_workflow TEXT,
  quick_actions TEXT, -- JSON array
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Minimal authentication tables
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Seed a default admin user if not exists (password: admin123)
INSERT OR IGNORE INTO users (email, name, password_hash, is_active)
VALUES ('admin@sol.com', 'Admin User', 'admin123', 1);



