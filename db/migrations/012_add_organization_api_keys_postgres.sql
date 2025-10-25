-- Migration: Add organization-level API keys (PostgreSQL)
-- This allows organizations to create API keys that can be shared with team members
-- for MCP/ChatGPT integration while maintaining organization-level data isolation

-- Add organization_id column to api_keys table (nullable for backward compatibility)
ALTER TABLE api_keys ADD COLUMN organization_id INTEGER;

-- Make user_id nullable to support organization-scoped API keys
ALTER TABLE api_keys ALTER COLUMN user_id DROP NOT NULL;

-- Add foreign key constraint for organization_id
ALTER TABLE api_keys ADD CONSTRAINT fk_api_keys_organization 
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- Add index for organization-scoped lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_organization_id ON api_keys(organization_id);

-- Update api_key_usage table to track organization usage
ALTER TABLE api_key_usage ADD COLUMN organization_id INTEGER;

-- Add foreign key constraint for organization_id in api_key_usage
ALTER TABLE api_key_usage ADD CONSTRAINT fk_api_key_usage_organization 
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- Add index for organization usage tracking
CREATE INDEX IF NOT EXISTS idx_api_key_usage_organization_id ON api_key_usage(organization_id);

-- Create view for organization API key details
CREATE OR REPLACE VIEW organization_api_key_details AS
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
WHERE ak.is_active = true;
