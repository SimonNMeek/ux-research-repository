# Root Cause Analysis: Database Configuration Loss During Agent Development

## Incident Summary
During agent upgrade work, the application's database connection was inadvertently switched from PostgreSQL (production/staging) to SQLite (local-only), causing loss of access to all user data, workspaces, and superadmin accounts.

## Timeline
1. **Initial State**: App using PostgreSQL via `DATABASE_URL` from Vercel
2. **During Troubleshooting**: DATABASE_URL was cleared/emptied in `.env.local`
3. **Impact**: App switched to SQLite (default when DATABASE_URL not set)
4. **User Discovery**: Login failures, missing workspaces/users
5. **Band-aid Fix**: Created SQLite user without data
6. **Real Fix**: Restored DATABASE_URL from Vercel via `vercel env pull`

## Root Causes

### Primary: Environment Variable Assumption
- **What happened**: Cleared DATABASE_URL to "force local SQLite" during troubleshooting
- **Why it happened**: Assumed local dev should use SQLite without checking system design
- **Impact**: Disconnected from production/staging data

### Secondary: Lack of System Context
- **Missing**: No clear documentation that this is a **dual-database system**
- **Missing**: No warning that DATABASE_URL is critical for accessing real data
- **Missing**: No health check that verifies which database is in use

### Tertiary: Destructive Actions Without Verification
- **Pattern**: Made changes to critical config without asking "what was working before?"
- **Pattern**: Didn't verify current state before making changes
- **Pattern**: Applied "fixes" that worked around the problem rather than restoring original state

## Contributing Factors

1. **No Environment Setup Guide**: New developers have no clear onboarding
2. **No Architecture Documentation**: Database selection logic wasn't documented
3. **No Decision Log**: Why DATABASE_URL is used vs SQLite wasn't explained
4. **No Safety Checks**: System doesn't warn when switching database backends
5. **Agent Work Unrelated**: The agent changes themselves didn't cause this—troubleshooting did

## Why This Happens During Agent Work

- Agent debugging often requires "clean state" assumptions
- CSS/build errors led to cache clearing, which expanded to "clean everything"
- No clear boundary between "app config" and "dev cache"
- Missing "stop and verify" checkpoints during troubleshooting

## Prevention Strategies

### Immediate (Technical)
1. **Environment Lock File**: `.env.local.example` with `DATABASE_URL=# REQUIRED - use 'vercel env pull'`
2. **Health Check Enhancement**: Add "Database Type" check that reports sqlite vs postgres
3. **Startup Warning**: If DATABASE_URL empty in production-like env, warn user
4. **Read-only Mode Flag**: `.env.local` could have `# DO NOT EDIT DATABASE_URL` comment

### Process
1. **Change Protocol**: Always check `git diff .env.local` before committing changes
2. **Pre-flight Check**: Before env changes, run `vercel env ls` to see what should be set
3. **Rollback Plan**: Document how to restore: `vercel env pull .env.local --environment=development`
4. **Context First**: When debugging, first document "what was working" before changing anything

### Documentation
1. **SETUP.md**: Step-by-step environment setup (see below)
2. **ARCHITECTURE.md**: Database selection, why it exists, when to use what
3. **DECISIONS.md**: Why DATABASE_URL is used, what happens when missing
4. **TROUBLESHOOTING.md**: Common issues and their real fixes (not workarounds)

## Lessons Learned

1. **Environment variables are infrastructure, not code** - treat them with same care as DB schema
2. **"What was working before?" is the first debugging question**
3. **Band-aid fixes that work around the problem are worse than the original problem**
4. **If you don't understand why something is configured, ask or document it before changing**

## Similar Incidents Prevention

- Any env var that switches backend behavior should be documented and protected
- Health checks should verify critical configuration matches expectations
- Onboarding docs should include "how to restore your environment" steps

