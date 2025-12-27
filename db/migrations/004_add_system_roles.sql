-- System Roles and Permissions Migration
-- Adds global role system separate from workspace-specific roles

-- Add global system role to users table
ALTER TABLE users ADD COLUMN system_role TEXT DEFAULT 'contributor' 
  CHECK (system_role IN ('super_admin', 'admin', 'contributor', 'viewer'));

-- Update existing admin user to be super_admin
UPDATE users SET system_role = 'super_admin' WHERE email = 'admin@sol.com';

-- Permissions mapping table (optional, for flexibility)
CREATE TABLE IF NOT EXISTS role_permissions (
  role TEXT NOT NULL,
  permission TEXT NOT NULL,
  PRIMARY KEY (role, permission)
);

-- Define permissions for each system role
-- Super Admin: Full system access
INSERT OR IGNORE INTO role_permissions (role, permission) VALUES
  ('super_admin', 'manage_users'),
  ('super_admin', 'manage_workspaces'),
  ('super_admin', 'manage_projects'),
  ('super_admin', 'manage_documents'),
  ('super_admin', 'manage_roles'),
  ('super_admin', 'view_all');

-- Admin: Can manage workspaces and projects they have access to
INSERT OR IGNORE INTO role_permissions (role, permission) VALUES
  ('admin', 'manage_workspaces'),
  ('admin', 'manage_projects'),
  ('admin', 'manage_documents'),
  ('admin', 'view_workspaces');

-- Contributor: Can add/edit documents in projects they have access to
INSERT OR IGNORE INTO role_permissions (role, permission) VALUES
  ('contributor', 'manage_documents'),
  ('contributor', 'view_workspaces'),
  ('contributor', 'view_projects');

-- Viewer: Read-only access
INSERT OR IGNORE INTO role_permissions (role, permission) VALUES
  ('viewer', 'view_workspaces'),
  ('viewer', 'view_projects'),
  ('viewer', 'view_documents');

-- Add first_name and last_name columns to users
ALTER TABLE users ADD COLUMN first_name TEXT;
ALTER TABLE users ADD COLUMN last_name TEXT;

-- Migrate existing name field if needed (split "Admin User" -> "Admin" + "User")
UPDATE users SET 
  first_name = CASE 
    WHEN instr(name, ' ') > 0 THEN substr(name, 1, instr(name, ' ') - 1)
    ELSE name
  END,
  last_name = CASE 
    WHEN instr(name, ' ') > 0 THEN substr(name, instr(name, ' ') + 1)
    ELSE ''
  END
WHERE first_name IS NULL;

-- Create index for faster role lookups
CREATE INDEX IF NOT EXISTS idx_users_system_role ON users(system_role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

