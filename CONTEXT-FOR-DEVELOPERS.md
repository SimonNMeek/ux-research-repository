# Context Guide for New Developers

> **Purpose**: This document helps developers (human or AI) understand the system architecture, decisions, and "why things are this way" before making changes.

## System Overview

**What This Is**: A multi-tenant UX research platform with organization-scoped API keys for AI agent integration.

**Key Components**:
- Next.js 15 app (React 19)
- Dual-database system (SQLite local, PostgreSQL production)
- MCP (Model Context Protocol) integration for AI agents
- Multi-tenant workspace/project/document structure

## Critical Configuration

### DATABASE_URL: The Most Important Variable

**What it does**: Determines which database the app uses
- **If set** → PostgreSQL (production/staging data)
- **If empty/missing** → SQLite (local-only, empty by default)

**Why this matters**: 
- Production users, workspaces, and data live in PostgreSQL
- SQLite is only for true local-only development
- **NEVER clear DATABASE_URL** - you'll lose access to real data

**How to restore**:
```bash
vercel env pull .env.local --environment=development
```

**Where it comes from**: Vercel environment variables (Development/Preview/Production)

### Other Critical Envs
- `MCP_API_KEY`: Required for MCP proxy endpoint (`/api/agent-mcp`)
- `OPENAI_API_KEY`: Used by in-app AI agent (`/api/mcp-ai`)

## Database Architecture

### Selection Logic
Located in: `db/adapter.ts` → `getDbType()`

```typescript
export function getDbType(): DbType {
  return process.env.DATABASE_URL ? 'postgres' : 'sqlite';
}
```

**Decision**: This is automatic. Don't try to override it.

### When to Use What

**PostgreSQL (DATABASE_URL set)**:
- Development that needs real data
- Testing with production-like data
- Any work that involves existing users/workspaces
- **This is the default for team development**

**SQLite (DATABASE_URL empty)**:
- Truly isolated testing
- Fresh database for new feature testing
- **Rarely used in practice**

### Database Files
- PostgreSQL: Remote (Neon/Vercel Postgres)
- SQLite: `db/data.sqlite` (local file)

## Authentication Flow

1. User submits email/password → `/api/auth/login`
2. `authenticateUser()` queries database (Postgres or SQLite based on DATABASE_URL)
3. On success: Creates session in `user_sessions` table
4. Sets `session_id` cookie (HttpOnly, SameSite=lax)
5. Middleware checks cookie on protected routes

**Protected Routes**: `/w/*`, `/workspaces`, `/org/*`, `/analytics`

## AI Agent Architecture

### Two Agent Implementations

**1. In-App Agent** (`/api/mcp-ai`):
- Uses OpenAI directly
- Has basic document retrieval
- Uses workspace-scoped search
- **Status**: Being improved, but not as capable as MCP

**2. MCP Proxy** (`/api/agent-mcp`):
- Proxies to `/api/mcp` tools
- Uses organization-scoped API keys
- Full MCP tool access (search, get_document, etc.)
- **Status**: Production-ready, matches ChatGPT quality

### Which to Use

- **MCP Proxy**: Better for production, has all the tools
- **In-App**: Simpler, but limited retrieval

**UI Toggle**: The AI assistant panel has "Use MCP (server proxy)" checkbox.

## Common Pitfalls

### ❌ "Let me clean the cache and reinstall everything"
**Problem**: This can clear `.env.local` or corrupt node_modules
**Better**: Clear only `.next` folder first, then check if issue persists

### ❌ "I'll force SQLite to test locally"
**Problem**: You'll lose all your data access
**Better**: Use PostgreSQL with DATABASE_URL from Vercel

### ❌ "I'll fix the login by creating a test user"
**Problem**: Test user won't have workspaces/org data
**Better**: Restore original DATABASE_URL and use real credentials

### ❌ "The CSS is 404, let me rebuild node_modules"
**Problem**: This can break PostCSS/better-sqlite3 native modules
**Better**: Clear `.next` only, or if needed: `npm rebuild better-sqlite3`

## Decision Log

### Why Dual Database?
- **Local development**: Fast, no network latency
- **Production**: Multi-user, scalable, cloud-hosted
- **Automatic selection**: One codebase works for both

### Why DATABASE_URL for Production?
- Vercel deployments need remote database
- Neon Postgres provides managed, scalable database
- Environment variables are the standard way to configure per-environment

### Why MCP and In-App Agent Both Exist?
- **MCP**: Full-featured, production-ready, matches external ChatGPT quality
- **In-App**: Simpler, direct OpenAI, being improved for basic use cases
- **Migration path**: Eventually in-app may catch up, but MCP is the standard

## Health Check System

Located: `scripts/test-system-health.js`

**What it checks**:
- Authentication (401 when not logged in)
- Protected routes redirect properly
- Database connectivity (no 500s)
- Search/favorites/kanban work

**Always run**: `npm run test:health:both` before and after changes

## Recovery Procedures

### If DATABASE_URL is Lost
```bash
vercel env pull .env.local --environment=development
# Restart dev server
npm run dev
```

### If Login Breaks
1. Check which database is in use: `grep DATABASE_URL .env.local`
2. If empty → restore from Vercel (see above)
3. If set → check Postgres connection is working
4. Test with: `curl -X POST http://localhost:3000/api/auth/login ...`

### If CSS/Build Breaks
1. Clear `.next` only: `rm -rf .next`
2. Restart: `npm run dev`
3. If persists: `npm rebuild better-sqlite3` (if using SQLite)
4. Last resort: `rm -rf node_modules package-lock.json .next && npm install`

### If Node Modules Corrupt
```bash
# Stop dev server first
pkill -f "next dev"
# Clean install
rm -rf node_modules package-lock.json .next
npm install
npm run dev
```

## Development Workflow

### Starting Fresh (New Developer)
1. Clone repo
2. `npm install`
3. `vercel env pull .env.local --environment=development`
4. `npm run dev`
5. Run health checks: `npm run test:health`

### Making Changes
1. **Before**: Run `npm run test:health:both`
2. **During**: Make changes on feature branch
3. **After**: Run health checks again
4. **Before commit**: Check `git diff .env.local` - should be empty or MCP_API_KEY only

### Debugging Issues
1. **First question**: "What was working before?"
2. **Check logs**: Dev server terminal output
3. **Check health**: `/dev-check` page or `npm run test:health`
4. **Check env**: `cat .env.local` - is DATABASE_URL set?
5. **Don't guess**: If unsure, ask or document before changing

## File Structure

### Critical Files (Don't Break These)
- `.env.local` - Environment config (DATABASE_URL, MCP_API_KEY)
- `db/adapter.ts` - Database selection logic
- `middleware.ts` - Authentication protection
- `lib/auth.ts` - Session management

### Safe to Modify
- `app/api/mcp-ai/route.ts` - In-app agent logic
- `components/AIAssistant.tsx` - UI components
- Feature branches - Safe to experiment

## When Things Go Wrong

**Golden Rule**: If something that was working stops working, and you made env/config changes, **restore the original state first**, then debug.

**Steps**:
1. Stop making changes
2. Document what was working before
3. Check git diff for config changes
4. Restore original state
5. Verify it works again
6. Then debug incrementally

## Questions to Ask Yourself

Before changing environment/config:
- "Why is this configured this way?"
- "What depends on this configuration?"
- "What was working before I started?"
- "How do I restore this if I break it?"

Before making system-level changes:
- "Is there documentation explaining this?"
- "Have I run health checks to verify current state?"
- "Is this change on a feature branch?"
- "Can I undo this easily?"

## For AI Assistants Specifically

**Read this document FIRST** before making any:
- Environment variable changes
- Database configuration changes
- Authentication flow changes
- Build/cache clearing operations

**Before proposing solutions**:
- Check `CONTEXT-FOR-DEVELOPERS.md` (this file)
- Check `SYSTEM-INSTRUCTIONS.md` for health check protocols
- Check `INCIDENT-RCA.md` for common pitfalls
- Check `docs/CLAUDE-WEB-REMOTE-MCP-SETUP.md` for Claude Web Remote MCP setup

**Always verify**:
- Current database type (check .env.local)
- Health check status (`npm run test:health`)
- What was working before you started

