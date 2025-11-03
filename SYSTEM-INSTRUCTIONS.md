# System Instructions for AI Assistant

## 🎯 **Primary Role**
You are working on a **multi-tenant research platform** with organization-scoped API keys for AI agent integration (ChatGPT/Claude). The system includes:
- Main research app (workspaces, projects, documents, search, favoriting)
- SuperAdmin-only Kanban board (`/productbacklog`)
- Organization management (user invites, API keys)
- PostgreSQL database with proper authentication

## 🧪 **CRITICAL: Always Run Health Checks**

**Before making ANY changes:**
```bash
npm run test:health:both
```

**After making ANY changes:**
```bash
npm run test:health:both
# Update SYSTEM-HEALTH.md with results
```

## 📋 **Test Suite Commands**
- `npm run test:health` - Test local only
- `npm run test:health:prod` - Test production only  
- `npm run test:health:both` - Test both environments

## 🚨 **What the Tests Check**
1. **Authentication** - Proper 401 responses when not authenticated
2. **Workspace Functionality** - Proper 307 redirects to login
3. **Search & Favorites** - Proper 307 redirects to login
4. **Kanban Board** - SuperAdmin-only access working
5. **Organization Management** - Proper 307 redirects to login
6. **Database Connectivity** - No 500 errors

## 📊 **Expected Results**
- **Local:** 6/6 tests should pass (100%)
- **Production:** 6/6 tests should pass (100%)
- **Any failures = STOP and investigate**

## 🔧 **Common Issues to Watch For**
- Build corruption (vendor-chunks errors)
- Missing imports (`nanoid`, `Label`, etc.)
- Security vulnerabilities (unprotected routes)
- Database connection issues
- PostgreSQL client errors

## 📝 **Documentation Requirements**
- Always update `SYSTEM-HEALTH.md` after changes
- Include risk level (LOW/MEDIUM/HIGH)
- Document what was tested
- Record test results

## 🎯 **Key Files to Monitor**
- `middleware.ts` - Authentication protection
- `src/server/repo/document.ts` - Search functionality
- `components/kanban/` - Kanban board components
- `lib/kanban/` - Kanban data management
- `app/api/` - API endpoints

## ⚠️ **Red Flags**
- Any 500 errors in logs
- Build failures with vendor-chunks
- Authentication bypasses
- Database connection errors
- Missing dependencies

## 🚀 **Deployment Process**
1. Run `npm run test:health:both`
2. Fix any failures
3. **Merge to `main` branch** (Vercel deploys from `main`, not feature branches)
4. Deploy to Vercel
5. Run `npm run test:health:prod`
6. Update `SYSTEM-HEALTH.md`

## 💡 **Context Management**
- Always check `SYSTEM-HEALTH.md` first
- Run health checks before starting work
- Use test results to understand system state
- Document all changes with risk assessment

---

## 🗄️ **Database Architecture**

### **Overview**
The application uses a **dual-database system** that automatically selects between SQLite (local development) and PostgreSQL (production/staging) based on environment configuration. This is implemented through a unified adapter layer that provides a consistent interface regardless of the underlying database.

### **Database Selection Logic**

**Location:** `db/adapter.ts`, function `getDbType()`

**Decision Point:**
```typescript
export function getDbType(): DbType {
  return process.env.DATABASE_URL ? 'postgres' : 'sqlite';
}
```

**How it works:**
1. Checks for the presence of `process.env.DATABASE_URL`
2. If `DATABASE_URL` exists → uses **PostgreSQL**
3. If `DATABASE_URL` is missing/undefined → uses **SQLite**

**Important:** Next.js automatically loads environment variables from `.env.local` files. If `DATABASE_URL` is set in `.env.local`, even local development will use PostgreSQL.

### **SQLite Implementation**

**Location:** `db/index.ts`

**Behavior:**
- Opens file-based database at `db/data.sqlite`
- Uses `better-sqlite3` library
- Synchronous operations (no async/await needed)
- Enables WAL (Write-Ahead Logging) mode for better concurrency
- Automatically runs migrations from `db/migrations/` directory
- Creates database file if it doesn't exist
- Initializes schema from `db/schema.sql` if database is new

**When used:**
- Local development when `DATABASE_URL` is not set
- Fast, file-based, no network latency
- Single process access (limited concurrency)

### **PostgreSQL Implementation**

**Location:** `db/postgres.ts`

**Connection Pool Configuration:**
```typescript
{
  max: 10,                    // Maximum 10 connections in pool
  min: 2,                      // Keep minimum 2 connections alive
  idleTimeoutMillis: 60000,    // Close idle connections after 60 seconds
  connectionTimeoutMillis: 10000,  // 10 second timeout for new connections
  acquireTimeoutMillis: 10000,    // 10 second timeout to get connection from pool
  statement_timeout: 30000,        // 30 second timeout for query execution
  keepAlive: true,                 // Keep TCP connections alive
  keepAliveInitialDelayMillis: 10000,
  ssl: { rejectUnauthorized: false } // SSL in production, false in dev
}
```

**Query Retry Logic:**
- Automatic retry on connection failures (3 attempts total)
- Exponential backoff between retries (1s, 2s delays)
- Only retries on `ETIMEDOUT` errors
- Other errors fail immediately after retries

**Connection Pool Lifecycle:**
- Singleton pattern: One pool instance shared across all requests
- Pool is created on first access to `getPostgresPool()`
- Pool persists for the lifetime of the Node.js process
- Errors on idle clients are logged but don't crash the app

**When used:**
- When `DATABASE_URL` environment variable is set
- Works with both local PostgreSQL and remote cloud databases
- Network latency issues can cause `ETIMEDOUT` errors
- Connection pool can be exhausted if too many concurrent requests

### **Adapter Layer**

**Location:** `db/adapter.ts`

**Purpose:** Provides a unified interface (`DbAdapter`) that works identically for both SQLite and PostgreSQL.

**Interface:**
```typescript
interface DbAdapter {
  type: 'sqlite' | 'postgres';
  query(sql: string, params?: any[]): Promise<QueryResult> | QueryResult;
  prepare(sql: string): StatementAdapter;
  transaction(callback): Promise<T> | T;
  close(): void | Promise<void>;
}
```

**Key Methods:**
1. **`getDbAdapter()`** - Returns appropriate adapter based on `getDbType()`
2. **`query()`** - Executes SQL queries (async for PostgreSQL, sync for SQLite)
3. **`prepare()`** - Prepares SQL statements (handles parameter placeholder conversion)
4. **`transaction()`** - Executes code within a database transaction

**SQL Syntax Translation:**
- Parameter placeholders: `?` (SQLite) → `$1, $2, $3...` (PostgreSQL)
- Boolean values: `true/false` → `1/0` (SQLite) or `true/false` (PostgreSQL)
- JSON columns: `TEXT` (SQLite) → `JSONB` (PostgreSQL)
- Timestamps: `CURRENT_TIMESTAMP` (both, but PostgreSQL uses with timezone)
- Full-text search: SQLite FTS → PostgreSQL `tsvector`/`tsquery`

### **Compatibility Layer**

**Location:** `db/compat.ts`

**Purpose:** Backward compatibility for code that still uses the old `getDb()` function (returns better-sqlite3 style interface).

**How it works:**
1. Creates a mock database object that mimics `better-sqlite3` API
2. Routes calls through the adapter layer
3. Converts SQL parameter placeholders (`?` → `$1, $2...`)
4. Handles async/sync differences transparently

**Legacy Code Path:**
- Old code: `getDb()` from `db/index.ts`
- If `DATABASE_URL` exists: `db/index.ts` redirects to `db/compat.ts`
- If `DATABASE_URL` missing: `db/index.ts` returns actual SQLite database

### **PostgreSQL Connection Reliability - Issues & Solutions**

#### **Previously Observed Problems (Fixed 2025-10-29)**

**Observed Problems:**
1. **ETIMEDOUT errors** - Connection attempts timing out after 10 seconds
2. **Connection terminated unexpectedly** - Idle connections being dropped
3. **AggregateError cascades** - Multiple queries failing simultaneously
4. **Incorrect error detection** - Retry logic checking `error.message` instead of `error.code`

**Root Causes Identified:**
- **Connection pool size:** Limited to 10 connections, insufficient under load
- **Connection timeout:** 10 seconds too short for remote databases with network latency
- **Idle connection management:** 60-second idle timeout, but database server closing them sooner
- **No connection health checks:** Pool not verifying connections alive before use
- **Retry logic limited:** Only 2 retries with basic error detection
- **Error detection bug:** Checking `error.message.includes('ETIMEDOUT')` instead of `error.code === 'ETIMEDOUT'`

**Impact:**
- Authentication failures (can't validate sessions)
- Workspace loading failures (can't query database)
- Search failures (can't execute queries)
- AI Assistant failures (can't access context)
- App appears "broken" even though code is correct

#### **Solutions Implemented (2025-10-29)**

**1. Connection Pool Configuration Improvements**
- **Increased pool size:** `max: 10` → `max: 20` connections
- **Increased minimum connections:** `min: 2` → `min: 3` (keeps more warm connections)
- **Increased connection timeout:** `connectionTimeoutMillis: 10000` → `30000` (30 seconds)
- **Increased acquire timeout:** `acquireTimeoutMillis: 10000` → `30000` (30 seconds)
- **Decreased idle timeout:** `idleTimeoutMillis: 60000` → `30000` (prevents stale connections)
- **Increased statement timeout:** `statement_timeout: 30000` → `60000` (60 seconds for complex queries)
- **Added `allowExitOnIdle: false`** - Prevents pool from exiting when idle

**Location:** `db/postgres.ts:22-37`

**2. Enhanced Error Detection**
- **Fixed error detection:** Now checks `error.code` instead of `error.message`
- **Comprehensive retryable codes:** Handles `ETIMEDOUT`, `ECONNRESET`, `EPIPE`, `ENOTFOUND`, `ECONNREFUSED`
- **PostgreSQL-specific codes:** Handles `57P01`, `57P02`, `57P03`, `08003`, `08006`, `08001`
- **Fallback message checking:** Still checks error messages as secondary indicator

**Location:** `db/postgres.ts:61-96` - `isRetryableError()` function

**3. Improved Retry Logic**
- **Increased default retries:** `retries: 2` → `retries: 3` (4 total attempts including initial)
- **Exponential backoff with jitter:** Base delay `2^attempt * 1000ms` + random 0-500ms (prevents thundering herd)
- **Connection health refresh:** After timeout/reset errors, attempts health check query to refresh pool
- **Better error logging:** Logs error code, retryable status, and attempt number

**Location:** `db/postgres.ts:98-147` - `query()` function

**4. Connection Health Validation**
- **`getClient()` retry logic:** Validates connection with `SELECT 1` before returning
- **Dead connection detection:** Releases dead connections and retries automatically
- **Connection timeout race:** Uses `Promise.race()` with 30-second timeout for client acquisition
- **Health check on errors:** Performs health check after connection errors to refresh pool

**Location:** `db/postgres.ts:149-190` - `getClient()` function

**5. Connection Error Handlers**
- **Pool error handler:** Logs but doesn't crash on idle client errors
- **Client error handler:** Listens for connection errors (`ETIMEDOUT`, `ECONNRESET`, `EPIPE`) and logs them
- **Automatic cleanup:** Pool automatically removes dead connections

**Location:** `db/postgres.ts:39-56` - Pool event handlers

**Test Results:**
- ✅ All system health tests passing (12/12)
- ✅ Local development: 6 tests passed
- ✅ Production (Vercel): 6 tests passed
- ✅ Success rate: 100%

**Critical Files:**
- `db/postgres.ts:13-59` - Pool configuration and error handlers
- `db/postgres.ts:61-96` - Error detection logic
- `db/postgres.ts:98-147` - Query retry logic
- `db/postgres.ts:149-190` - Client acquisition with health checks
- `db/adapter.ts:105-114` - PostgreSQL adapter query execution

---

**Remember: The system is fragile. Always test before and after changes.**
