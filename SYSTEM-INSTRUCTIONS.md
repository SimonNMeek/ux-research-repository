# System Instructions for AI Assistant

## 🎯 Primary Role
You’re maintaining a multi-tenant research platform backed exclusively by PostgreSQL. Key surfaces:
- Research app (workspaces, projects, documents, search, favourites)
- SuperAdmin-only Kanban board (`/productbacklog`)
- Organization management (invites, API keys, workspace membership)
- AI agent endpoints (MCP + OpenAI orchestration)

## ✅ Health-Check Discipline
- **Before significant work:** `npm run test:health`
- **Before shipping/merging:** `npm run test:health:both`
- **After shipping:** document the outcome in `SYSTEM-HEALTH.md`
- Keep a running note of anything you skipped; the default expectation is “tests ran and passed”.

### Test Suite Shortcuts
- `npm run test:health` – Local stack only (requires local Postgres running and reachable via `DATABASE_URL`)
- `npm run test:health:prod` – Ping production endpoints
- `npm run test:health:both` – Runs local first, then prod

### What the Suite Covers
1. Authentication (`/login`, `/api/auth/me`)
2. Workspace guard rails (`/api/workspaces`, `/w/<slug>`)
3. Search & favourites endpoints
4. Kanban access control
5. Organization routes (`/api/org/users`)
6. Database-backed APIs and agent endpoints
7. MCP agent contract sanity check

### Expected Outcomes
- Local + prod: **all checks green**. Any failure → stop, fix, re-run.
- If you have to skip production checks, note why in `SYSTEM-HEALTH.md`.

## 🧰 Daily Operating Instructions
- Ensure Postgres is running locally (`ux_repo_test` by default). The app now **requires** `DATABASE_URL`.
- Export/start dev server with the variable set, e.g.  
  `DATABASE_URL=postgresql://simonmeek@localhost:5432/ux_repo_test npm run dev`
- Use `scripts/seed-local-postgres.ts` for the baseline demo data. Run `scripts/seed-sugar-docs.ts` when you need the Sugar LLP fixtures restored.
- Kanban defaults live in `lib/kanban/seed-data/default-board.json`—don’t overwrite unless you mean to.
- Keep an eye on `/tmp/next-dev.log` whenever the UI looks blank; most issues surface there first.

## 🔴 Red Flags
- `DATABASE_URL` missing/empty (dev server crashes on login).
- Any 500 responses from `app/api/...` routes.
- RLS errors (`permission denied for table ...`) – usually means `set_config` not called before queries.
- Unauthorised access paths (Kanban, `/org/*`) responding with 200 when logged out.
- Background seed scripts silently inserting zero rows.

## 🚀 Deploying / Cutting Releases
1. Re-seed/bake any demo data you need locally (Postgres only).
2. `npm run test:health:both` – ensure both environments are green.
3. Merge to `main` (Vercel deploys from `main`).
4. Confirm production deploy, then re-run `npm run test:health:prod`.
5. Update `SYSTEM-HEALTH.md` with date, change summary, risk, testing performed.

## 🧭 Context Checklist Before Coding
- Read `SYSTEM-HEALTH.md` for outstanding risks.
- Skim `docs/LOCAL-POSTGRES-NOTES.md` for the Postgres-only migration details.
- Review the most recent seeded data expectations—no more SQLite fallbacks.

---

## 🗄️ Database Architecture (Postgres-Only)

### Core Module
- **Location:** `db/postgres.ts`
- Exports:
  - `query(text, params?)`
  - `transaction(async (client) => { ... })`
  - `getClient()` (handles pooled connection with retries)
  - `setCurrentUser(client, userId)` and `setCurrentOrganization(client, orgId)`  
    These wrap `SELECT set_config('app.user_id', $1::text, true)` so Row-Level Security policies kick in for every request.
  - `isHealthy()` for future `/healthz` usage.
- Pool is a singleton. Retry logic handles transient errors (`ETIMEDOUT`, `ECONNRESET`, etc.) with exponential backoff.

### Request Flow
1. API routes / repos call `query` or `transaction`.
2. Middleware ensures we enter a transaction, set `app.user_id`/`app.organization_id`, and then run business logic.
3. RLS policies defined in `db/postgres-schema.sql` enforce tenant isolation automatically.

### Seeding & Demo Data
- `scripts/seed-local-postgres.ts` builds orgs, workspaces, projects, users, memberships, and baseline documents.
- `scripts/seed-sugar-docs.ts` adds Sugar LLP workspaces/projects/docs; it now sets RLS context before inserts.
- If you need to snapshot the Kanban board, export/import via `lib/kanban/seed-data/default-board.json` or browser `localStorage`.

### Operational Guardrails
- **DATABASE_URL is mandatory.** Without it, `db/postgres.ts` throws and the dev server responds 500.
- `npm run dev` should always be invoked with `DATABASE_URL` in the environment; consider adding it to your shell profile.
- If you hit “too many clients already” errors, restart the dev server—the pool recovers on boot.
- Use `psql` plus `SET row_security = off;` if you need to inspect tables bypassing policies (admin-level debugging only).

### Files to Watch
- `db/postgres.ts` – pool config, helper exports.
- `db/postgres-schema.sql` – canonical schema + RLS policies.
- `lib/auth.ts`, `lib/api-auth.ts`, `lib/mcp-middleware.ts`, `src/server/repo/*` – all now call Postgres helpers directly.
- `scripts/seed-*.ts` – ensure they set user/org context before inserting tenant data.

---

**Remember:** No adapter, no SQLite safety net. When something breaks, check `DATABASE_URL`, confirm RLS context is set, and run the health suite. Document any deviations in `SYSTEM-HEALTH.md`. 
