-- Make user_id nullable in api_keys table to support organization-scoped keys
-- SQLite doesn't support ALTER COLUMN, so we need to recreate the table

-- Drop the view first
DROP VIEW IF EXISTS organization_api_key_details;

-- Create new table with nullable user_id
DROP TABLE IF EXISTS api_keys_new;
CREATE TABLE api_keys_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER, -- Made nullable
  organization_id INTEGER,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  name TEXT NOT NULL,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Copy data from old table
INSERT INTO api_keys_new (id, user_id, key_hash, key_prefix, name, last_used_at, created_at, expires_at, is_active)
SELECT id, user_id, key_hash, key_prefix, name, last_used_at, created_at, expires_at, is_active FROM api_keys;

-- Drop old table
DROP TABLE api_keys;

-- Rename new table
ALTER TABLE api_keys_new RENAME TO api_keys;

-- Recreate indexes
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_active ON api_keys(is_active);
CREATE INDEX idx_api_keys_organization_id ON api_keys(organization_id);

-- Recreate the view
CREATE VIEW IF NOT EXISTS organization_api_key_details AS
SELECT 
  ak.id,
  ak.key_prefix,
  ak.name,
  ak.last_used_at,
  ak.created_at,
  ak.expires_at,
  ak.is_active,
  o.id as organization_id,
  o.name as organization_name,
  o.slug as organization_slug,
  CASE 
    WHEN ak.user_id IS NOT NULL THEN 'user'
    WHEN ak.organization_id IS NOT NULL THEN 'organization'
    ELSE 'unknown'
  END as scope_type
FROM api_keys ak
LEFT JOIN organizations o ON ak.organization_id = o.id
WHERE ak.is_active = 1;
