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

-- Insert default workspace
INSERT INTO workspaces (slug, name, metadata) 
VALUES ('demo-co', 'Farm to Fork App', '{"description": "Main research workspace"}');

-- Insert default project
INSERT INTO projects (workspace_id, slug, name, description, metadata)
VALUES (1, 'legacy-research', 'Legacy Research', 'Existing research documents', '{}');
