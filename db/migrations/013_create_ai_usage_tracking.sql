-- Migration: Create AI usage tracking table
-- This table tracks AI assistant usage for analytics and billing

CREATE TABLE IF NOT EXISTS ai_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  organization_id INTEGER NOT NULL,
  workspace_slug TEXT NOT NULL,
  query TEXT NOT NULL,
  tokens_used INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id ON ai_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_organization_id ON ai_usage(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_workspace_slug ON ai_usage(workspace_slug);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON ai_usage(created_at);


