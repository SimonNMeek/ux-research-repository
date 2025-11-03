-- Migration: Create ai_usage table for tracking AI assistant usage

CREATE TABLE IF NOT EXISTS ai_usage (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    workspace_slug VARCHAR(255) NOT NULL,
    query TEXT NOT NULL,
    tokens_used INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id ON ai_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_organization_id ON ai_usage(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON ai_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_workspace_slug ON ai_usage(workspace_slug);

