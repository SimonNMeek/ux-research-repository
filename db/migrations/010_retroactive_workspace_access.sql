-- Migration: Retroactively grant workspace access to organization members
-- This ensures all organization members have access to all workspaces in their organization

-- For each organization, grant workspace access to all members who don't already have it
-- This handles the case where workspaces were created before users joined the organization

-- Insert missing workspace access for organization members
INSERT INTO user_workspaces (user_id, workspace_id, role, granted_by)
SELECT 
  uo.user_id,
  w.id as workspace_id,
  CASE 
    WHEN uo.role = 'owner' THEN 'admin'
    WHEN uo.role = 'admin' THEN 'admin' 
    ELSE 'member'
  END as role,
  -- Use the workspace creator as the granter, or fallback to first owner
  COALESCE(
    (SELECT uw.granted_by FROM user_workspaces uw WHERE uw.workspace_id = w.id AND uw.role = 'owner' LIMIT 1),
    (SELECT uo2.user_id FROM user_organizations uo2 WHERE uo2.organization_id = w.organization_id AND uo2.role = 'owner' LIMIT 1)
  ) as granted_by
FROM user_organizations uo
INNER JOIN workspaces w ON w.organization_id = uo.organization_id
LEFT JOIN user_workspaces uw ON uw.user_id = uo.user_id AND uw.workspace_id = w.id
WHERE uw.user_id IS NULL  -- Only insert where access doesn't already exist
AND w.organization_id IS NOT NULL;  -- Only for organization workspaces

-- Add comment for tracking
INSERT INTO migrations (filename) VALUES ('010_retroactive_workspace_access.sql');
