-- PostgreSQL Schema for Multi-Tenant UX Research Repository
-- Includes Row-Level Security (RLS) for automatic tenant isolation

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For faster text search

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  password_hash VARCHAR(255) NOT NULL,
  system_role VARCHAR(50) DEFAULT 'contributor' CHECK (system_role IN ('super_admin', 'admin', 'contributor', 'viewer')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_system_role ON users(system_role);

-- User sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

-- API keys for LLM integrations
CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  key_prefix VARCHAR(20) NOT NULL, -- First 8 chars for display (e.g., "sk-1234...")
  name VARCHAR(255) NOT NULL, -- User-friendly name like "ChatGPT Integration"
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_active ON api_keys(is_active);

-- API usage tracking (for rate limiting and analytics)
CREATE TABLE IF NOT EXISTS api_key_usage (
  id SERIAL PRIMARY KEY,
  api_key_id INTEGER NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint VARCHAR(255) NOT NULL,
  workspace_id INTEGER REFERENCES workspaces(id) ON DELETE SET NULL,
  request_count INTEGER DEFAULT 1,
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_api_key_usage_key_date ON api_key_usage(api_key_id, date);
CREATE INDEX idx_api_key_usage_workspace ON api_key_usage(workspace_id, date);

-- =============================================================================
-- MULTI-TENANCY: ORGANIZATIONS
-- =============================================================================

-- Organizations (true tenant boundary)
CREATE TABLE IF NOT EXISTS organizations (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  billing_email VARCHAR(255),
  plan VARCHAR(50) DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  max_workspaces INTEGER DEFAULT 3,
  max_users INTEGER DEFAULT 5,
  max_documents INTEGER DEFAULT 100,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_plan ON organizations(plan);

-- User-Organization membership
CREATE TABLE IF NOT EXISTS user_organizations (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  invited_by INTEGER REFERENCES users(id),
  PRIMARY KEY (user_id, organization_id)
);

CREATE INDEX idx_user_organizations_user_id ON user_organizations(user_id);
CREATE INDEX idx_user_organizations_organization_id ON user_organizations(organization_id);

-- =============================================================================
-- WORKSPACES & PROJECTS
-- =============================================================================

-- Workspaces (belong to organizations)
CREATE TABLE IF NOT EXISTS workspaces (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workspaces_organization_id ON workspaces(organization_id);
CREATE INDEX idx_workspaces_slug ON workspaces(slug);

-- User-Workspace access
CREATE TABLE IF NOT EXISTS user_workspaces (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  granted_by INTEGER REFERENCES users(id),
  PRIMARY KEY (user_id, workspace_id)
);

CREATE INDEX idx_user_workspaces_user_id ON user_workspaces(user_id);
CREATE INDEX idx_user_workspaces_workspace_id ON user_workspaces(workspace_id);

-- Projects (belong to workspaces)
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  slug VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, slug)
);

CREATE INDEX idx_projects_workspace_id ON projects(workspace_id);
CREATE INDEX idx_projects_workspace_slug ON projects(workspace_id, slug);

-- =============================================================================
-- DOCUMENTS & CONTENT
-- =============================================================================

-- Documents (belong to projects)
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  original_text TEXT,
  clean_text TEXT,
  source_url TEXT,
  author VARCHAR(255),
  is_favorite BOOLEAN DEFAULT false,
  anonymization_profile_id VARCHAR(100),
  clean_version INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_documents_project_id ON documents(project_id);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX idx_documents_is_favorite ON documents(is_favorite) WHERE is_favorite = true;

-- Full-text search index
CREATE INDEX idx_documents_title_search ON documents USING gin(to_tsvector('english', title));
CREATE INDEX idx_documents_body_search ON documents USING gin(to_tsvector('english', body));

-- Tags (workspace-scoped)
CREATE TABLE IF NOT EXISTS workspace_tags (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, name)
);

CREATE INDEX idx_workspace_tags_workspace_id ON workspace_tags(workspace_id);
CREATE INDEX idx_workspace_tags_name ON workspace_tags(name);

-- Document-Tag junction
CREATE TABLE IF NOT EXISTS document_tags (
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES workspace_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (document_id, tag_id)
);

CREATE INDEX idx_document_tags_document_id ON document_tags(document_id);
CREATE INDEX idx_document_tags_tag_id ON document_tags(tag_id);

-- =============================================================================
-- ANONYMIZATION
-- =============================================================================

-- Anonymization profiles
CREATE TABLE IF NOT EXISTS anonymization_profiles (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  config JSONB NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pseudonyms for anonymization
CREATE TABLE IF NOT EXISTS pseudonyms (
  id SERIAL PRIMARY KEY,
  pii_hash VARCHAR(255) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL,
  label VARCHAR(255) NOT NULL,
  first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pseudonyms_pii_hash ON pseudonyms(pii_hash);

-- Anonymization audit log
CREATE TABLE IF NOT EXISTS anonymization_audit (
  id SERIAL PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  profile_id VARCHAR(100) NOT NULL REFERENCES anonymization_profiles(id) ON DELETE CASCADE,
  detector_version VARCHAR(50) NOT NULL,
  summary JSONB NOT NULL,
  duration_ms INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_anonymization_audit_document_id ON anonymization_audit(document_id);

-- =============================================================================
-- SEARCH & ACTIVITY
-- =============================================================================

-- Search history
CREATE TABLE IF NOT EXISTS searches (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_ids JSONB NOT NULL,
  query TEXT NOT NULL,
  mode VARCHAR(50) NOT NULL CHECK (mode IN ('fulltext', 'semantic')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_searches_workspace_id ON searches(workspace_id);
CREATE INDEX idx_searches_created_at ON searches(created_at DESC);

-- User preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(100),
  preferred_workflows JSONB,
  last_workflow VARCHAR(100),
  quick_actions JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- =============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tenant-scoped tables
-- FORCE means it applies even to table owners (critical for testing!)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces FORCE ROW LEVEL SECURITY;

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects FORCE ROW LEVEL SECURITY;

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;

ALTER TABLE workspace_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_tags FORCE ROW LEVEL SECURITY;

ALTER TABLE searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE searches FORCE ROW LEVEL SECURITY;

-- Policy: Users can only see their own organizations
CREATE POLICY org_access_policy ON organizations
  FOR ALL
  USING (
    id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = current_setting('app.user_id', true)::int
    )
    OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = current_setting('app.user_id', true)::int 
      AND system_role = 'super_admin'
    )
  );

-- Policy: Users can only see workspaces in their organizations
CREATE POLICY workspace_access_policy ON workspaces
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = current_setting('app.user_id', true)::int
    )
    AND
    id IN (
      SELECT workspace_id
      FROM user_workspaces
      WHERE user_id = current_setting('app.user_id', true)::int
    )
    OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = current_setting('app.user_id', true)::int 
      AND system_role = 'super_admin'
    )
  );

-- Policy: Users can only see projects in their workspaces
CREATE POLICY project_access_policy ON projects
  FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM user_workspaces
      WHERE user_id = current_setting('app.user_id', true)::int
    )
    OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = current_setting('app.user_id', true)::int 
      AND system_role = 'super_admin'
    )
  );

-- Policy: Users can only see documents in their projects
CREATE POLICY document_access_policy ON documents
  FOR ALL
  USING (
    project_id IN (
      SELECT p.id 
      FROM projects p
      INNER JOIN user_workspaces uw ON p.workspace_id = uw.workspace_id
      WHERE uw.user_id = current_setting('app.user_id', true)::int
    )
    OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = current_setting('app.user_id', true)::int 
      AND system_role = 'super_admin'
    )
  );

-- Policy: Users can only see tags in their workspaces
CREATE POLICY tag_access_policy ON workspace_tags
  FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM user_workspaces
      WHERE user_id = current_setting('app.user_id', true)::int
    )
    OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = current_setting('app.user_id', true)::int 
      AND system_role = 'super_admin'
    )
  );

-- Policy: Users can only see searches in their workspaces
CREATE POLICY search_access_policy ON searches
  FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM user_workspaces
      WHERE user_id = current_setting('app.user_id', true)::int
    )
    OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = current_setting('app.user_id', true)::int 
      AND system_role = 'super_admin'
    )
  );

-- =============================================================================
-- TRIGGERS & FUNCTIONS
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- VIEWS FOR CONVENIENCE
-- =============================================================================

-- View: Workspaces with organization info
CREATE OR REPLACE VIEW workspace_details AS
SELECT 
  w.*,
  o.name as organization_name,
  o.slug as organization_slug,
  o.plan as organization_plan
FROM workspaces w
INNER JOIN organizations o ON w.organization_id = o.id;

-- View: Documents with full hierarchy
CREATE OR REPLACE VIEW document_details AS
SELECT 
  d.*,
  p.name as project_name,
  p.slug as project_slug,
  w.name as workspace_name,
  w.slug as workspace_slug,
  o.name as organization_name,
  o.id as organization_id
FROM documents d
INNER JOIN projects p ON d.project_id = p.id
INNER JOIN workspaces w ON p.workspace_id = w.id
INNER JOIN organizations o ON w.organization_id = o.id;

-- =============================================================================
-- SEED DATA (Optional)
-- =============================================================================

-- Insert default admin user (password: admin123 - should be hashed in production!)
INSERT INTO users (email, name, first_name, last_name, password_hash, system_role, is_active)
VALUES ('admin@sol.com', 'Admin User', 'Admin', 'User', '$2b$10$placeholder', 'super_admin', true)
ON CONFLICT (email) DO NOTHING;

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE organizations IS 'Organizations are the tenant boundary for multi-tenancy';
COMMENT ON TABLE workspaces IS 'Workspaces belong to organizations and contain projects';
COMMENT ON TABLE projects IS 'Projects belong to workspaces and contain documents';
COMMENT ON TABLE documents IS 'Documents are the core content units';
COMMENT ON POLICY org_access_policy ON organizations IS 'RLS: Users can only access their own organizations';
COMMENT ON POLICY workspace_access_policy ON workspaces IS 'RLS: Users can only access workspaces they belong to';
COMMENT ON POLICY document_access_policy ON documents IS 'RLS: Automatic tenant isolation at document level';

