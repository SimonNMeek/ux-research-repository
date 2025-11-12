# System Health Document

**Last Updated:** 2025-11-12T10:24:58Z  
**Updated By:** GPT-5 Codex  
**Change Description:** Added password-reset flow (token table, endpoints, email templates, UI) and reran local health suite (7/7 passing)

## 🎯 Current Status Snapshot

| Component | Status | Last Tested | Notes |
|-----------|--------|-------------|-------|
| **Authentication** | ✅ Working | 2025-11-12T10:24:58Z | `npm run test:health` (local) |
| **Main App (workspaces/projects/docs)** | ✅ Working | 2025-11-12T10:24:58Z | Health suite verifies redirects + API guards; SupaDupa seed confirmed |
| **Search & Favourites** | ✅ Working | 2025-11-12T10:24:58Z | Health suite POSTs confirm auth gating |
| **Kanban Board** | ✅ Working | 2025-11-12T10:24:58Z | Health suite confirms accessibility; data stored in `lib/kanban/seed-data/default-board.json` |
| **Organization Management** | ✅ Working | 2025-11-12T10:24:58Z | Health suite ensures `/api/org/users` protected |
| **Database / RLS** | ✅ Working | 2025-11-12T10:24:58Z | RLS helper (`withRlsContext`) now wraps API routes/repo calls |
| **Deployment** | ⚠️ Untested in this pass | Last deploy 2025-10-25 | No production deploy during this run; prod health checks still green |

## 🔧 Recent Changes

### 2025-11-12 – Postgres-Everywhere Refactor & RLS Helper
- **What changed:** Removed reliance on `db/adapter.ts`, standardised all runtime code on `db/postgres.ts`, added `set_config` helpers for RLS and later introduced `withRlsContext` (backed by async-local transactions) so API routes automatically set `app.user_id` / `app.organization_id`. Rewrote seed scripts, refreshed docs (`SYSTEM-INSTRUCTIONS.md`, `docs/LOCAL-POSTGRES-NOTES.md`), and tightened health checks.
- **Files modified:** `db/postgres.ts`, `lib/auth.ts`, `lib/api-auth.ts`, `lib/mcp-middleware.ts`, `src/server/repo/*`, `app/api/workspaces/route.ts`, `app/api/agent-mcp/route.ts`, `scripts/seed-local-postgres.ts`, `scripts/seed-sugar-docs.ts`, `SYSTEM-INSTRUCTIONS.md`, `docs/LOCAL-POSTGRES-NOTES.md`, `scripts/test-system-health.js`, `SYSTEM-HEALTH.md`
- **Risk level:** **MEDIUM** – everything depends on Postgres locally; misconfigured `DATABASE_URL` or missing RLS wrapper breaks auth.
- **Testing performed:** `DATABASE_URL=... npm run test:health:both` (Local 7/7, Production 7/7) before merge, followed by `DATABASE_URL=... npm run test:health` after merging RLS helper.
- **Status:** **SUCCESS**

### 2025-11-12 – Password Reset Loop (Forgot Password)
- **What changed:** Added `password_reset_tokens` table, password reset APIs (`/api/auth/forgot-password`, `/api/auth/reset-password`), Resend email helper, and UI pages (`/forgot-password`, `/reset-password`) with login link updates.
- **Files modified:** `db/migrations/015_create_password_reset_tokens.sql`, `lib/password-reset.ts`, `lib/email.ts`, `app/api/auth/forgot-password/route.ts`, `app/api/auth/reset-password/route.ts`, `app/forgot-password/page.tsx`, `app/reset-password/page.tsx`, `app/login/page.tsx`, `SYSTEM-HEALTH.md`
- **Risk level:** **LOW** – scoped change, limited surface area.
- **Testing performed:** `DATABASE_URL=... npm run test:health` (local 7/7).
- **Status:** **SUCCESS**

_(Change log for October remains below for historical context; results are pre-refactor and should be treated as outdated until the new tests run.)_

### 2025-10-25 – Sol Analytics Dashboard Implementation
- **What changed:** Added analytics dashboard with Chart.js and org filtering.
- **Risk level:** LOW
- **Testing performed:** `npm run test:health:both` (all green at the time).
- **Status:** SUCCESS (historical)

### 2025-10-23 – Simple Production Homepage
- **What changed:** Added simple production landing page and environment toggle.
- **Risk level:** LOW
- **Testing performed:** `npm run test:health:both`
- **Status:** SUCCESS (historical)

### 2025-10-22 – CSV Upload Feature Deployment
- **What changed:** Added CSV upload to project pages.
- **Risk level:** LOW
- **Testing performed:** `npm run test:health:both`
- **Status:** SUCCESS (historical)

### 2025-10-21 – Security & Invite Fixes
- Multiple fixes (invite URLs, org route protection, invitation limit cleanup).
- Tests at the time: `npm run test:health:both` (green).
- Status: SUCCESS (historical)

## 🧪 Test Results

### Automated Suite
| Environment | Last Run | Result | Notes |
|-------------|----------|--------|-------|
| Local (`npm run test:health`) | 2025-11-12 | ✅ 7/7 | Postgres-only stack verified |
| Production (`npm run test:health:prod`) | 2025-11-12 | ✅ 7/7 | Vercel endpoints responding as expected |

### Manual Smoke (2025-11-12)
- `npm run dev` with `DATABASE_URL=postgresql://simonmeek@localhost:5432/ux_repo_test`
- Login via `/api/auth/login` with `admin@heysol.io`
- `/api/workspaces` returns expected org/workspace list
- `scripts/seed-sugar-docs.ts` inserts SupaDupa and Sugar LLP docs (confirmed via API + `psql`)
- Kanban board renders with seeded JSON defaults

## 🚨 Known Issues / Follow-ups

| Issue | Severity | Status | Notes |
|-------|----------|--------|-------|
| SupaDupa demo dataset trimmed vs legacy baseline | LOW | OPEN | Current seed includes 2 docs; historic dataset ~16 docs. Add richer fixture if needed |

## 📋 Next Steps

- [ ] Run `npm run test:health:both` on the Postgres-only stack
- [ ] Update this file with fresh test timestamps/results
- [ ] Decide whether to restore the full SupaDupa dataset (scripts/seed-sugar-docs.ts)
- [ ] Add `/healthz` endpoint backed by `db/postgres.ts::isHealthy()` (optional, future)

## 🔍 Quick Health Check Commands

```bash
# Local automated suite (requires DATABASE_URL in env)
DATABASE_URL=postgresql://simonmeek@localhost:5432/ux_repo_test npm run test:health

# Production-only checks
npm run test:health:prod

# Combined local + prod
npm run test:health:both

# Manual sanity checks
curl -s http://localhost:3000/api/auth/me            # expect 401 when unsigned
curl -s http://localhost:3000/api/workspaces         # expect 401 when unsigned
curl -s -b cookies.txt http://localhost:3000/api/workspaces   # after login
curl -s http://localhost:3000/productbacklog         # ensure page loads (may 307 if logged out)
```

## 🛡️ Security / RLS Notes
- `db/postgres.ts` now calls `set_config` helpers, so RLS is enforced everywhere.
- Manual SQL debugging: use `SET row_security = off;` sparingly and only in `psql`.
- Kanban board remains SuperAdmin-only (`middleware.ts`).

## 📝 Change Log Template (unchanged)

When making changes, update this document with:

```markdown
### [DATE] - [CHANGE DESCRIPTION]
- **What changed:** [DETAILS]
- **Files modified:** [LIST]
- **Risk level:** [LOW/MEDIUM/HIGH]
- **Testing performed:** [WHAT RAN]
- **Status:** [SUCCESS/FAILURE/NEEDS_ATTENTION]
- **Test results:** [INCLUDE COMMAND + OUTCOME]
```

---

**Action required:** Run the automated health checks against the new Postgres-only stack and refresh this doc with the results before the next release.***
