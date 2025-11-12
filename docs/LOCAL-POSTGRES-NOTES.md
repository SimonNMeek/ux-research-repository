# Local Postgres Rollout Notes

## Plain-English Summary
- The SQLite/Postgres adapter is gone—everything now talks directly to Postgres.
- Local dev must run a Postgres instance (`ux_repo_test` by default) with `DATABASE_URL` set in `.env.local`.
- We have reproducible seed scripts (`scripts/seed-local-postgres.ts` + `scripts/seed-sugar-docs.ts`) to recreate demo data, plus `lib/kanban/seed-data/default-board.json` for the Kanban board.
- RLS context is set explicitly inside `withRlsContext`, so every API call tells Postgres which user/org is making the request (no more manual `set_config` calls scattered around).
- Health checks (`npm run test:health` / `npm run test:health:both`) are the canary—run them whenever you change backend code or deploy.

## Technical Notes
- `db/postgres.ts` exports a connection pool, retryable `query()`, `transaction()`, and RLS helpers (`setCurrentUser`, `setCurrentOrganization`, `withRlsContext` backed by `AsyncLocalStorage`).
- Server code wraps privileged operations in `withRlsContext({ userId, organizationId }, async () => { ... })` so all queries run with RLS enforced.
- Repositories (`src/server/repo/*`) now call `query` directly; SQLite-specific conditionals are gone.
- Seed scripts rely on the RLS helpers, so they set the session context before inserting tenant data.
- Local health suite checks:
  - `npm run test:health` → local endpoints
  - `npm run test:health:prod` → prod endpoints
  - `npm run test:health:both` → both sequentially
- If `DATABASE_URL` is missing, the dev server aborts on startup, which is intentional: the app requires Postgres everywhere.

# Local Postgres Rollout Notes

## Plain-English Summary
- We retired the old SQLite/Postgres adapter and now run everything against Postgres, locally and in production.
- Devs only need a running Postgres instance (`ux_repo_test`); `DATABASE_URL` in `.env.local` points there.
- Login, workspaces, MCP routes, and other data-heavy features now use the same code paths as production, so fewer environment-only bugs.
- Seeding scripts (`scripts/seed-local-postgres.ts`, `scripts/seed-sugar-docs.ts`) repopulate demo orgs, including Sugar LLP, when we need fresh data.
- Kanban board data stays in `lib/kanban/seed-data/default-board.json`, so we have a safe default if someone wipes `localStorage`.

## Technical Notes
- New `db/postgres.ts` is the single entry point: exports `query`, `transaction`, `getClient`, `setCurrentUser`, and `setCurrentOrganization`. Connection reuse handled by a singleton `pg` pool with retry logic.
- RLS context now uses `set_config('app.user_id', ...)`/`set_config('app.organization_id', ...)`, which works in transactions and keeps policies intact.
- All repositories and API routes that previously depended on `db/adapter.ts` now import `query` (or `transaction`) directly. This removes the SQLite-specific branching.
- Migrations are treated as Postgres-only. The adapter, `db/index.ts`, and SQLite migrations remain in git history but are no longer used in the local workflow.
- Seeding updates:
  - `scripts/seed-local-postgres.ts` creates organizations, workspaces, projects, users, memberships, and base documents.
  - `scripts/seed-sugar-docs.ts` reinstates the Sugar LLP workspaces/projects/docs with RLS context set.
- Remember to export `DATABASE_URL=postgresql://simonmeek@localhost:5432/ux_repo_test` (or your own connection string) before `npm run dev`; without it, Next.js will crash on login.
- Health checks: `db/postgres.ts` exposes `isHealthy()` for future `/healthz` endpoints.


