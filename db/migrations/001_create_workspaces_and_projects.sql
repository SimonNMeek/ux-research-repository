-- Migration 001: Create workspaces and projects structure
-- This migration converts the existing single-tenant structure to multi-workspace

-- Create workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT DEFAULT '{}' -- JSON metadata
);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id INTEGER NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT DEFAULT '{}', -- JSON metadata
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  UNIQUE(workspace_id, slug)
);

-- Create new documents table (replaces notes)
CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  original_text TEXT,
  clean_text TEXT,
  source_url TEXT,
  author TEXT,
  is_favorite BOOLEAN DEFAULT 0,
  anonymization_profile_id TEXT,
  clean_version INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Update tags table to be workspace-scoped
CREATE TABLE IF NOT EXISTS workspace_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  UNIQUE(workspace_id, name)
);

-- Create document-tag junction table
CREATE TABLE IF NOT EXISTS document_tags (
  document_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (document_id, tag_id),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES workspace_tags(id) ON DELETE CASCADE
);

-- Create searches table for tracking search history
CREATE TABLE IF NOT EXISTS searches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id INTEGER NOT NULL,
  project_ids TEXT NOT NULL, -- JSON array of project IDs
  query TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('fulltext', 'semantic')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT DEFAULT '{}', -- JSON metadata including duration_ms, scanned_count
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_workspace_slug ON projects(workspace_id, slug);
CREATE INDEX IF NOT EXISTS idx_documents_project_created ON documents(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workspace_tags_workspace_name ON workspace_tags(workspace_id, name);
CREATE INDEX IF NOT EXISTS idx_document_tags_document ON document_tags(document_id);
CREATE INDEX IF NOT EXISTS idx_document_tags_tag ON document_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_searches_workspace ON searches(workspace_id, created_at DESC);

-- Create FTS virtual table for documents
CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
  title, body, content='documents', content_rowid='id'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS documents_ai AFTER INSERT ON documents BEGIN
  INSERT INTO documents_fts(rowid, title, body)
  VALUES (new.id, new.title, new.body);
END;

CREATE TRIGGER IF NOT EXISTS documents_ad AFTER DELETE ON documents BEGIN
  INSERT INTO documents_fts(documents_fts, rowid, title, body)
  VALUES('delete', old.id, old.title, old.body);
END;

CREATE TRIGGER IF NOT EXISTS documents_au AFTER UPDATE ON documents BEGIN
  INSERT INTO documents_fts(documents_fts, rowid, title, body)
  VALUES('delete', old.id, old.title, old.body);
  INSERT INTO documents_fts(rowid, title, body)
  VALUES (new.id, new.title, new.body);
END;

-- Trigger to prevent cross-workspace tag linkage
CREATE TRIGGER IF NOT EXISTS prevent_cross_workspace_tags
  BEFORE INSERT ON document_tags
  FOR EACH ROW
BEGIN
  SELECT CASE
    WHEN (
      SELECT wt.workspace_id 
      FROM workspace_tags wt 
      WHERE wt.id = NEW.tag_id
    ) != (
      SELECT p.workspace_id 
      FROM documents d 
      JOIN projects p ON d.project_id = p.id 
      WHERE d.id = NEW.document_id
    )
    THEN RAISE(ABORT, 'Cannot link tag from different workspace to document')
  END;
END;

-- Update anonymization audit to reference documents
DROP TABLE IF EXISTS anonymization_audit;
CREATE TABLE IF NOT EXISTS anonymization_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  profile_id TEXT NOT NULL,
  detector_version TEXT NOT NULL,
  summary TEXT NOT NULL, -- JSON summary
  duration_ms INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (profile_id) REFERENCES anonymization_profiles(id) ON DELETE CASCADE
);
