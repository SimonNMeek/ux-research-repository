-- Sugar Organization Data Backup
-- Generated on: 2025-10-20T18:56:20.834Z

-- Organization
INSERT INTO organizations (id, name, slug, created_at, updated_at) VALUES (8, 'Sugar LLP', 'sugar-llp-9', 'Fri Oct 17 2025 07:43:57 GMT+0100 (British Summer Time)', 'Fri Oct 17 2025 07:43:57 GMT+0100 (British Summer Time)');

-- Workspaces
INSERT INTO workspaces (id, name, slug, organization_id, created_at, updated_at) VALUES (13, 'Sugar LLP Workspace', 'sugar-llp-workspace', 8, 'Fri Oct 17 2025 09:03:45 GMT+0100 (British Summer Time)', 'undefined');
INSERT INTO workspaces (id, name, slug, organization_id, created_at, updated_at) VALUES (18, 'SupaDupa App', 'supadupa-app', 8, 'Sat Oct 18 2025 11:16:04 GMT+0100 (British Summer Time)', 'undefined');
INSERT INTO workspaces (id, name, slug, organization_id, created_at, updated_at) VALUES (19, 'Rob's Workspace', 'robs-workspace', 8, 'Sat Oct 18 2025 11:41:47 GMT+0100 (British Summer Time)', 'undefined');

-- Projects
INSERT INTO projects (id, name, slug, workspace_id, created_at, updated_at) VALUES (4, 'Rob's great project', 'robs-great-project', 13, 'Sat Oct 18 2025 11:40:17 GMT+0100 (British Summer Time)', 'undefined');
INSERT INTO projects (id, name, slug, workspace_id, created_at, updated_at) VALUES (8, 'Market Research', 'market-research', 18, 'Mon Oct 20 2025 16:56:23 GMT+0100 (British Summer Time)', 'undefined');
INSERT INTO projects (id, name, slug, workspace_id, created_at, updated_at) VALUES (7, 'Product Research', 'product-research', 18, 'Mon Oct 20 2025 13:00:17 GMT+0100 (British Summer Time)', 'undefined');
INSERT INTO projects (id, name, slug, workspace_id, created_at, updated_at) VALUES (6, 'SupaDupa User Research', 'supadupa-user-research', 18, 'Mon Oct 20 2025 12:59:48 GMT+0100 (British Summer Time)', 'undefined');
INSERT INTO projects (id, name, slug, workspace_id, created_at, updated_at) VALUES (5, 'Project for Rob's workspace', 'project-for-robs-workspace', 19, 'Sat Oct 18 2025 11:42:16 GMT+0100 (British Summer Time)', 'undefined');

-- Documents
INSERT INTO documents (id, title, content, project_id, created_at, updated_at) VALUES (24, 'SupaDupa_ourPersonas.txt', 'undefined', 7, 'Mon Oct 20 2025 13:02:53 GMT+0100 (British Summer Time)', 'undefined');
INSERT INTO documents (id, title, content, project_id, created_at, updated_at) VALUES (26, 'SupaDupaToneOfVoice.md', 'undefined', 7, 'Mon Oct 20 2025 13:02:53 GMT+0100 (British Summer Time)', 'undefined');
INSERT INTO documents (id, title, content, project_id, created_at, updated_at) VALUES (27, 'SupaDupaValueProp.md', 'undefined', 7, 'Mon Oct 20 2025 13:02:54 GMT+0100 (British Summer Time)', 'undefined');
INSERT INTO documents (id, title, content, project_id, created_at, updated_at) VALUES (23, 'ResearchAssumptionsSD.md', 'undefined', 7, 'Mon Oct 20 2025 13:02:53 GMT+0100 (British Summer Time)', 'undefined');
INSERT INTO documents (id, title, content, project_id, created_at, updated_at) VALUES (25, 'SupaDupaFeatures.md', 'undefined', 7, 'Mon Oct 20 2025 13:02:53 GMT+0100 (British Summer Time)', 'undefined');
INSERT INTO documents (id, title, content, project_id, created_at, updated_at) VALUES (30, 'pNPS-responses.md', 'undefined', 7, 'Mon Oct 20 2025 13:25:57 GMT+0100 (British Summer Time)', 'undefined');
INSERT INTO documents (id, title, content, project_id, created_at, updated_at) VALUES (31, 'csat-responses.md', 'undefined', 7, 'Mon Oct 20 2025 13:28:05 GMT+0100 (British Summer Time)', 'undefined');
INSERT INTO documents (id, title, content, project_id, created_at, updated_at) VALUES (17, 'user_interview1.md', 'undefined', 6, 'Mon Oct 20 2025 13:01:00 GMT+0100 (British Summer Time)', 'undefined');
INSERT INTO documents (id, title, content, project_id, created_at, updated_at) VALUES (18, 'user_interview2.md', 'undefined', 6, 'Mon Oct 20 2025 13:01:21 GMT+0100 (British Summer Time)', 'undefined');
INSERT INTO documents (id, title, content, project_id, created_at, updated_at) VALUES (19, 'user_interview3.md', 'undefined', 6, 'Mon Oct 20 2025 13:02:01 GMT+0100 (British Summer Time)', 'undefined');
INSERT INTO documents (id, title, content, project_id, created_at, updated_at) VALUES (20, 'user_interview4.md', 'undefined', 6, 'Mon Oct 20 2025 13:02:01 GMT+0100 (British Summer Time)', 'undefined');
INSERT INTO documents (id, title, content, project_id, created_at, updated_at) VALUES (21, 'user_interview5.md', 'undefined', 6, 'Mon Oct 20 2025 13:02:02 GMT+0100 (British Summer Time)', 'undefined');
INSERT INTO documents (id, title, content, project_id, created_at, updated_at) VALUES (22, 'user_interview6.md', 'undefined', 6, 'Mon Oct 20 2025 13:02:17 GMT+0100 (British Summer Time)', 'undefined');
INSERT INTO documents (id, title, content, project_id, created_at, updated_at) VALUES (28, 'SupaDupaUserJourneys.txt', 'undefined', 6, 'Mon Oct 20 2025 13:03:59 GMT+0100 (British Summer Time)', 'undefined');
INSERT INTO documents (id, title, content, project_id, created_at, updated_at) VALUES (29, 'SupdaDupa_InterviewScript.md', 'undefined', 6, 'Mon Oct 20 2025 13:04:58 GMT+0100 (British Summer Time)', 'undefined');

-- Users
INSERT INTO users (id, name, email, created_at, updated_at) VALUES (9, 'Robert Mould', 'rob@sugar.com', 'Fri Oct 17 2025 07:43:57 GMT+0100 (British Summer Time)', 'Sun Oct 19 2025 15:40:19 GMT+0100 (British Summer Time)');
INSERT INTO users (id, name, email, created_at, updated_at) VALUES (19, 'Simon Meek', 'simonmeek@gmail.com', 'Sat Oct 18 2025 10:10:18 GMT+0100 (British Summer Time)', 'Sat Oct 18 2025 11:40:51 GMT+0100 (British Summer Time)');

-- User Organizations
INSERT INTO user_organizations (user_id, organization_id, role, created_at) VALUES (9, 8, 'owner', 'Fri Oct 17 2025 07:43:57 GMT+0100 (British Summer Time)');
INSERT INTO user_organizations (user_id, organization_id, role, created_at) VALUES (19, 8, 'member', 'Sat Oct 18 2025 10:10:18 GMT+0100 (British Summer Time)');
