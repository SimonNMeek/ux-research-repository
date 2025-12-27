-- Recreate api_keys table with proper nullable user_id support
-- Drop the view first
DROP VIEW IF EXISTS organization_api_key_details;

-- Drop the table if it exists
DROP TABLE IF EXISTS api_keys;

-- Create the table with nullable user_id
CREATE TABLE api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER, -- Nullable to support organization-scoped keys
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

-- Create indexes
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
