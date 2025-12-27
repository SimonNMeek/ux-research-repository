-- Migration 005: Add Organizations Layer
-- Organizations are the true tenant boundary for multi-tenancy
-- Users belong to organizations, workspaces belong to organizations

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  billing_email TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  max_workspaces INTEGER DEFAULT 3,
  max_users INTEGER DEFAULT 5,
  max_documents INTEGER DEFAULT 100,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT DEFAULT '{}' -- JSON: custom_domain, branding, settings, etc.
);

-- Create user-organization membership table
CREATE TABLE IF NOT EXISTS user_organizations (
  user_id INTEGER NOT NULL,
  organization_id INTEGER NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  invited_by INTEGER,
  PRIMARY KEY (user_id, organization_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES users(id)
);

-- Add organization_id to workspaces
ALTER TABLE workspaces ADD COLUMN organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workspaces_organization_id ON workspaces(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_user_id ON user_organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_organization_id ON user_organizations(organization_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

-- Migrate existing data: Create a default organization for existing workspaces
-- This ensures backward compatibility

-- Create a default organization if workspaces exist
INSERT OR IGNORE INTO organizations (id, slug, name, plan, metadata)
SELECT 1, 'default-org', 'Default Organization', 'free', '{}'
WHERE EXISTS (SELECT 1 FROM workspaces WHERE organization_id IS NULL);

-- Assign all existing workspaces to the default organization
UPDATE workspaces 
SET organization_id = 1 
WHERE organization_id IS NULL 
  AND EXISTS (SELECT 1 FROM organizations WHERE id = 1);

-- For each user with workspace access, grant them organization access
INSERT OR IGNORE INTO user_organizations (user_id, organization_id, role, invited_by)
SELECT DISTINCT 
  uw.user_id,
  1, -- default org
  CASE 
    WHEN uw.role = 'owner' THEN 'owner'
    WHEN uw.role = 'admin' THEN 'admin'
    ELSE 'member'
  END,
  uw.user_id
FROM user_workspaces uw
WHERE EXISTS (SELECT 1 FROM organizations WHERE id = 1)
  AND NOT EXISTS (
    SELECT 1 FROM user_organizations uo 
    WHERE uo.user_id = uw.user_id AND uo.organization_id = 1
  );

-- Add constraint to ensure workspaces have an organization (for new data)
-- Note: SQLite doesn't support adding NOT NULL to existing columns,
-- so we'll enforce this at the application level

