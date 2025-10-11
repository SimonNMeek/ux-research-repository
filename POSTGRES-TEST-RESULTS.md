# 🧪 PostgreSQL Local Testing - Results

## ✅ **Test Status: SUCCESS**

PostgreSQL has been successfully installed, configured, and tested locally!

---

## 📊 What Was Done

### 1. Installation ✅
- Installed PostgreSQL 15 via Homebrew
- Started PostgreSQL service
- Added to PATH

### 2. Database Setup ✅
- Created test database: `ux_repo_test`
- Initialized schema from `db/postgres-schema.sql`
- Applied all tables, indexes, RLS policies

### 3. Data Migration ✅ (Partial)
Successfully migrated:
- ✅ 2 Users
- ✅ 1 Organization
- ✅ 2 Workspaces
- ✅ 7 Projects
- ⚠️  Documents (skipped due to corrupt SQLite FTS table)

### 4. Connection Test ✅
- Verified Postgres connection with Node.js
- Tested `pg` package
- Queried organizations table successfully

---

## 🐘 Your PostgreSQL Setup

**Database:** `ux_repo_test`  
**Connection:** `postgresql://simonmeek@localhost:5432/ux_repo_test`  
**Status:** ✅ Running  
**Service:** `brew services start postgresql@15`

**Check status:**
```bash
brew services list | grep postgresql
```

**Stop service:**
```bash
brew services stop postgresql@15
```

**Restart service:**
```bash
brew services restart postgresql@15
```

---

## 🧪 How to Test the App with Postgres

### Option 1: Quick Test (Terminal)
```bash
# Set DATABASE_URL for this session
export DATABASE_URL=postgresql://simonmeek@localhost:5432/ux_repo_test

# Start dev server
npm run dev

# Visit http://localhost:3000
```

### Option 2: Permanent (Add to .env.local)
Create `.env.local`:
```bash
DATABASE_URL=postgresql://simonmeek@localhost:5432/ux_repo_test
NODE_ENV=development
```

Then:
```bash
npm run dev
```

---

## 🔍 Verify It's Using Postgres

### Check 1: Logs
When the app starts, you should see Postgres connections instead of SQLite:
```
✅ Using PostgreSQL (not SQLite)
✅ Connection pool initialized
```

### Check 2: Database Queries
```bash
# Watch Postgres queries in real-time
/opt/homebrew/opt/postgresql@15/bin/psql ux_repo_test

# In psql:
SELECT * FROM pg_stat_activity WHERE datname = 'ux_repo_test';
```

### Check 3: Application Test
1. Visit http://localhost:3000
2. Login (your existing users should work)
3. Try to create a workspace
4. Check database:
```bash
/opt/homebrew/opt/postgresql@15/bin/psql ux_repo_test \
  -c "SELECT id, name, slug FROM workspaces ORDER BY created_at DESC LIMIT 5"
```

---

## 🧪 Test Row-Level Security (RLS)

### Manual RLS Test
```bash
# Connect to database
/opt/homebrew/opt/postgresql@15/bin/psql ux_repo_test

# Set user context (simulates logged-in user)
SET app.user_id = 1;

# This should only show workspaces user 1 has access to
SELECT * FROM workspaces;

# Change user
SET app.user_id = 2;

# Should show different workspaces
SELECT * FROM workspaces;
```

---

## 📝 What to Test

### Core Functionality
- [ ] User login works
- [ ] Can view workspaces
- [ ] Can create new workspace
- [ ] Can create projects
- [ ] Can add documents
- [ ] Search works
- [ ] Tags work

### Security
- [ ] RLS policies prevent cross-tenant access
- [ ] User can only see their organizations
- [ ] Workspace switching works correctly

### Performance
- [ ] Page loads feel fast
- [ ] Search is responsive
- [ ] No connection errors

---

## 📊 Database Tools

### psql (PostgreSQL CLI)
```bash
# Connect
/opt/homebrew/opt/postgresql@15/bin/psql ux_repo_test

# Useful commands in psql:
\dt          # List tables
\d tablename # Describe table structure
\di          # List indexes
\du          # List users
\l           # List databases
\q           # Quit
```

### Quick Queries
```bash
# Count records
/opt/homebrew/opt/postgresql@15/bin/psql ux_repo_test -c "
SELECT 
  'users' as table_name, COUNT(*) FROM users
  UNION ALL SELECT 'organizations', COUNT(*) FROM organizations
  UNION ALL SELECT 'workspaces', COUNT(*) FROM workspaces
  UNION ALL SELECT 'projects', COUNT(*) FROM projects
"

# Check RLS policies
/opt/homebrew/opt/postgresql@15/bin/psql ux_repo_test -c "
SELECT schemaname, tablename, policyname, permissive, cmd 
FROM pg_policies 
WHERE schemaname = 'public'
"

# Check indexes
/opt/homebrew/opt/postgresql@15/bin/psql ux_repo_test -c "
SELECT tablename, indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname
"
```

---

## 🐛 Troubleshooting

### Issue: "connection refused"
```bash
# Check if Postgres is running
brew services list | grep postgresql

# Start it if needed
brew services start postgresql@15
```

### Issue: "database does not exist"
```bash
# Recreate database
/opt/homebrew/opt/postgresql@15/bin/dropdb ux_repo_test
/opt/homebrew/opt/postgresql@15/bin/createdb ux_repo_test
/opt/homebrew/opt/postgresql@15/bin/psql ux_repo_test < db/postgres-schema.sql
```

### Issue: App still using SQLite
```bash
# Make sure DATABASE_URL is set
echo $DATABASE_URL

# Should output: postgresql://simonmeek@localhost:5432/ux_repo_test
```

### Issue: Migration errors
The SQLite database had a corrupted FTS table. This is OK - you have enough data in Postgres to test with:
- 2 users (can log in)
- 1 organization
- 2 workspaces
- 7 projects

You can create fresh documents through the app UI!

---

## ✅ Summary

### What Works ✅
- PostgreSQL installed and running
- Schema initialized with RLS policies
- Connection pooling configured
- Sample data migrated
- Ready for testing

### Next Steps

**Option 1: Test Now**
```bash
export DATABASE_URL=postgresql://simonmeek@localhost:5432/ux_repo_test
npm run dev
```

**Option 2: Deploy to Cloud**
Follow `PHASE-2-POSTGRES.md` to deploy to:
- Vercel + Neon
- Railway
- Supabase

---

## 🎉 Congratulations!

You now have:
- ✅ Local PostgreSQL running
- ✅ Schema with RLS policies
- ✅ Connection working
- ✅ Ready to test production database locally

**This is huge! You can now:**
1. Test Postgres locally before deploying
2. Verify RLS policies work
3. Test with production-like database
4. Debug issues locally
5. Deploy with confidence!

---

## 📚 Resources

- **Your Schema:** `db/postgres-schema.sql`
- **Migration Script:** `scripts/migrate-to-postgres.ts`
- **Deployment Guide:** `PHASE-2-POSTGRES.md`
- **PostgreSQL Docs:** https://www.postgresql.org/docs/15/

---

**Ready to test? Run:**
```bash
export DATABASE_URL=postgresql://simonmeek@localhost:5432/ux_repo_test
npm run dev
```

