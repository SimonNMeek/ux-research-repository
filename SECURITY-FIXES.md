# Security Fixes - Multi-Tenancy Phase 0

## Summary
Critical security vulnerabilities have been fixed to enable proper multi-tenancy and workspace isolation.

## Fixed Vulnerabilities

### 🔴 CRITICAL: Plaintext Password Storage
**Before:** Passwords were stored as plaintext in the database
**After:** 
- All new passwords are hashed with bcrypt (10 rounds)
- Legacy plaintext passwords are auto-upgraded on next login
- Uses bcryptjs for compatibility

**Files Changed:**
- `lib/auth.ts` - Added `hashPassword()` function and bcrypt comparison
- `app/api/auth/signup/route.ts` - Hash passwords before storing

### 🔴 CRITICAL: Global Workspace Access
**Before:** `/api/workspaces` returned ALL workspaces to any authenticated user
**After:** 
- Users only see workspaces they have explicit access to (via `user_workspaces` table)
- Super admins can see all workspaces
- Access is validated through JOIN with `user_workspaces`

**Files Changed:**
- `app/api/workspaces/route.ts` - Added user-specific workspace filtering

### 🔴 CRITICAL: No Workspace Access Control
**Before:** Workspace routes didn't verify user had access to the workspace
**After:**
- All workspace routes now enforce access via `user_workspaces` table
- Super admins bypass checks (for admin tools)
- Returns 403 if user lacks access

**Files Changed:**
- `src/server/workspace-resolver.ts` - Added workspace access validation in `resolveFromParams()`

### 🔴 CRITICAL: Auto-Grant on Signup
**Before:** New users automatically got access to ALL workspaces
**After:**
- Users must be explicitly invited to workspaces
- First user only gets a default workspace (if no workspaces exist)
- Proper tenant isolation

**Files Changed:**
- `app/api/auth/signup/route.ts` - Removed auto-grant loop

### 🔴 CRITICAL: Workspace Creator Had No Access
**Before:** When creating a workspace, creator wasn't added to `user_workspaces`
**After:**
- Creator is automatically granted 'owner' role in `user_workspaces`
- This happens atomically during workspace creation

**Files Changed:**
- `app/api/workspaces/route.ts` - Added auto-grant on workspace creation

## New Security Features

### Workspace Role-Based Permissions
Added granular permissions based on workspace roles:

| Role | View | Edit Docs | Create Projects | Manage Workspace |
|------|------|-----------|----------------|------------------|
| Owner | ✅ | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ | ✅ |
| Member | ✅ | ✅ | ❌ | ❌ |
| Viewer | ✅ | ❌ | ❌ | ❌ |

**Helper Functions Added:**
- `workspaceResolver.canModifyWorkspace(context)` - Owner/Admin only
- `workspaceResolver.canManageProjects(context)` - Owner/Admin only
- `workspaceResolver.canEditDocuments(context)` - Owner/Admin/Member
- `workspaceResolver.canViewWorkspace(context)` - All roles

### Updated API Routes
All workspace-scoped routes now enforce permissions:
- ✅ `app/w/[ws]/api/projects/route.ts` - Project creation requires Owner/Admin
- ✅ `app/w/[ws]/api/projects/[projectSlug]/documents/route.ts` - Document creation requires Member+
- ✅ `app/w/[ws]/api/projects/[projectSlug]/documents/[documentId]/route.ts` - Document deletion requires Member+

## Database Schema

### Key Tables for Multi-Tenancy

#### `user_workspaces`
Links users to workspaces with roles:
```sql
CREATE TABLE user_workspaces (
  user_id INTEGER NOT NULL,
  workspace_id INTEGER NOT NULL,
  role TEXT CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  granted_by INTEGER,
  PRIMARY KEY (user_id, workspace_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);
```

#### System vs Workspace Roles
- **System Role** (`users.system_role`): Global permissions (super_admin, admin, contributor, viewer)
- **Workspace Role** (`user_workspaces.role`): Per-workspace permissions (owner, admin, member, viewer)

## Testing Checklist

### Manual Testing
- [ ] Create new user - should NOT have access to existing workspaces
- [ ] Create workspace as user - should become owner automatically
- [ ] Try accessing another user's workspace - should get 403
- [ ] Invite user to workspace - should gain access
- [ ] Test project creation as Member - should fail (403)
- [ ] Test project creation as Admin - should succeed
- [ ] Test document creation as Viewer - should fail (403)
- [ ] Test document creation as Member - should succeed
- [ ] Verify passwords are hashed (check database)
- [ ] Login with old admin account - password should auto-upgrade

### API Security Tests
```bash
# 1. Create user A
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Alice","lastName":"Smith","email":"alice@example.com","password":"password123"}'

# 2. Create user B  
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Bob","lastName":"Jones","email":"bob@example.com","password":"password123"}'

# 3. Login as Alice, create workspace
# 4. Try to access Alice's workspace as Bob - should fail
# 5. Invite Bob to Alice's workspace
# 6. Try to access Alice's workspace as Bob - should succeed
```

## Next Steps for Full Multi-Tenancy

### Phase 1: Organizations Layer (Optional)
- Add `organizations` table as tenant boundary
- Organizations can have multiple workspaces
- Cleaner for billing and SSO

### Phase 2: Migrate to Postgres
- SQLite → PostgreSQL migration
- Add `tenant_id` or `organization_id` to all tables
- Connection pooling for production

### Phase 3: Row-Level Security (RLS)
- Implement Postgres RLS policies
- Set `app.tenant_id` in middleware
- Automatic query filtering by tenant

### Phase 4: Production Deploy
- Choose hosting (Vercel/Railway/Fly.io)
- S3/R2 storage with tenant prefixes
- Environment variables and secrets
- Health checks and monitoring
- Rate limiting per tenant

## Migration Notes

### Existing Data
If you have existing workspaces and users, run this to grant access:

```sql
-- Grant existing users access to existing workspaces as members
INSERT OR IGNORE INTO user_workspaces (user_id, workspace_id, role, granted_by)
SELECT u.id, w.id, 'member', 1
FROM users u, workspaces w
WHERE u.system_role != 'super_admin';

-- Grant super admins owner access to all workspaces
INSERT OR IGNORE INTO user_workspaces (user_id, workspace_id, role, granted_by)
SELECT u.id, w.id, 'owner', u.id
FROM users u, workspaces w
WHERE u.system_role = 'super_admin';
```

## Breaking Changes

### For Frontend
- `WorkspaceContext.user` is now **required** (not nullable)
- All workspace routes now require authentication
- 401 responses if not authenticated
- 403 responses if lacks workspace access

### For API Clients
- Must be authenticated to access any workspace routes
- Must have workspace access via `user_workspaces` table
- Workspace creation now returns workspace you own
- `/api/workspaces` only returns workspaces you have access to

## Security Best Practices Going Forward

1. **Never** bypass `withWorkspace()` for workspace-scoped routes
2. **Always** check workspace role before write operations
3. **Never** trust client-provided workspace/project IDs without validation
4. **Always** use parameterized queries (we already do this)
5. **Test** cross-tenant access attempts regularly
6. **Audit** `user_workspaces` table for suspicious grants
7. **Monitor** for privilege escalation attempts

## Contact
For questions or security concerns, contact the development team.

