# 🐘 Phase 2: PostgreSQL Migration Guide

## Overview

This guide walks you through migrating from SQLite (development) to PostgreSQL (production) with Row-Level Security for true database-level multi-tenancy.

## 🎯 What You Get

### Before (SQLite)
- ✅ Great for development
- ⚠️  Limited concurrency (~10 users)
- ⚠️  Single file database
- ⚠️  No built-in tenant isolation

### After (PostgreSQL)
- ✅ Production-grade database
- ✅ Handle 1000+ concurrent users
- ✅ Row-Level Security (RLS) - automatic tenant isolation
- ✅ Better performance and scaling
- ✅ Hosted options (Neon, Supabase, Railway)

---

## 🚀 Quick Start (Local Postgres)

### 1. Install PostgreSQL

**macOS (Homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu/Debian:**
```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
Download from https://www.postgresql.org/download/windows/

### 2. Create Database

```bash
# Connect to postgres
psql postgres

# Create database and user
CREATE DATABASE ux_repo;
CREATE USER ux_repo_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE ux_repo TO ux_repo_user;

# Grant schema privileges
\c ux_repo
GRANT ALL ON SCHEMA public TO ux_repo_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ux_repo_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ux_repo_user;

\q
```

### 3. Initialize Schema

```bash
# Apply PostgreSQL schema
psql ux_repo < db/postgres-schema.sql
```

### 4. Migrate Data

```bash
# Set DATABASE_URL and migrate
DATABASE_URL=postgresql://ux_repo_user:your_password@localhost:5432/ux_repo \
  npx tsx scripts/migrate-to-postgres.ts
```

### 5. Update Environment

Create `.env.local`:
```bash
DATABASE_URL=postgresql://ux_repo_user:your_password@localhost:5432/ux_repo
NODE_ENV=development
```

### 6. Test

```bash
npm run dev
# Visit http://localhost:3000
```

---

## ☁️ Cloud Hosting Options

### Option 1: Vercel + Neon (Recommended)

**Why Neon:**
- ✅ Serverless Postgres
- ✅ Auto-scaling
- ✅ Instant setup
- ✅ Free tier (512MB)
- ✅ Built for Vercel

**Setup:**

1. **Create Neon Account**
   - Go to https://neon.tech
   - Sign up (free)

2. **Create Project**
   - Click "New Project"
   - Name: "ux-repo"
   - Region: Choose closest to users
   - Postgres version: 15

3. **Get Connection String**
   ```
   postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

4. **Initialize Database**
   ```bash
   # Copy connection string
   psql "postgresql://user:password@ep-xxx.neon.tech/neondb" < db/postgres-schema.sql
   ```

5. **Migrate Data**
   ```bash
   DATABASE_URL="your-neon-connection-string" \
     npx tsx scripts/migrate-to-postgres.ts
   ```

6. **Deploy to Vercel**
   ```bash
   # Install Vercel CLI
   npm i -g vercel

   # Deploy
   vercel

   # Set environment variable
   vercel env add DATABASE_URL
   # Paste your Neon connection string

   # Deploy production
   vercel --prod
   ```

**Neon Pricing:**
- Free: 512MB storage, 0.5GB RAM
- Pro: $19/mo, 10GB storage, 4GB RAM
- Scale: Custom pricing

---

### Option 2: Railway

**Why Railway:**
- ✅ All-in-one (DB + hosting)
- ✅ Automatic DATABASE_URL
- ✅ Easy deployment
- ✅ $5 free credit

**Setup:**

1. **Create Railway Account**
   - Go to https://railway.app
   - Sign up with GitHub

2. **New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your repository

3. **Add PostgreSQL**
   - Click "+ New"
   - Select "Database" → "PostgreSQL"
   - Railway automatically sets DATABASE_URL

4. **Initialize Database**
   ```bash
   # Get connection string from Railway dashboard
   # Variables → DATABASE_URL
   psql "your-railway-connection-string" < db/postgres-schema.sql
   ```

5. **Migrate Data**
   ```bash
   DATABASE_URL="your-railway-connection-string" \
     npx tsx scripts/migrate-to-postgres.ts
   ```

6. **Deploy**
   - Push to GitHub
   - Railway auto-deploys

**Railway Pricing:**
- $5 free credit
- $5/mo per service after
- Pay only for usage

---

### Option 3: Supabase

**Why Supabase:**
- ✅ PostgreSQL + Auth + Storage
- ✅ Built-in dashboard
- ✅ Generous free tier
- ✅ Great for future features

**Setup:**

1. **Create Supabase Project**
   - Go to https://supabase.com
   - Sign up (free)
   - Create project

2. **Get Connection String**
   - Settings → Database
   - Connection string (Direct connection)
   - Copy the connection string

3. **Initialize Database**
   ```bash
   psql "your-supabase-connection-string" < db/postgres-schema.sql
   ```

4. **Migrate Data**
   ```bash
   DATABASE_URL="your-supabase-connection-string" \
     npx tsx scripts/migrate-to-postgres.ts
   ```

5. **Deploy**
   - Use Vercel, Railway, or any hosting
   - Set DATABASE_URL environment variable

**Supabase Pricing:**
- Free: 500MB database, 2GB bandwidth
- Pro: $25/mo, 8GB database, 50GB bandwidth
- Team: $599/mo, 100GB database

---

## 🔒 Row-Level Security (RLS) Explained

### What is RLS?

Row-Level Security automatically filters database rows based on the current user. Your application code doesn't need to add WHERE clauses - Postgres does it automatically!

### How It Works

```typescript
// BEFORE (Application-level filtering)
const workspaces = db.query(`
  SELECT * FROM workspaces 
  WHERE organization_id = ${userOrgId}  // Manual filter
`);

// AFTER (Database-level filtering with RLS)
await setCurrentUser(client, userId);
const workspaces = db.query(`
  SELECT * FROM workspaces  // RLS automatically filters!
`);
```

### Benefits

1. **Can't Leak Data** - Even if you forget WHERE clause, RLS protects you
2. **Audit Trail** - Database logs who accessed what
3. **Performance** - Postgres optimizes RLS policies
4. **Compliance** - Required for SOC2, HIPAA, etc.

### Example Policy

```sql
-- Only show workspaces user has access to
CREATE POLICY workspace_access ON workspaces
  FOR ALL
  USING (
    id IN (
      SELECT workspace_id 
      FROM user_workspaces 
      WHERE user_id = current_setting('app.user_id')::int
    )
  );
```

---

## 🧪 Testing Postgres Locally

### 1. Check Connection

```bash
DATABASE_URL=your-connection-string npx tsx -e "
  import { isHealthy } from './db/postgres';
  isHealthy().then(healthy => 
    console.log(healthy ? '✅ Connected' : '❌ Failed')
  );
"
```

### 2. Test RLS

```bash
# Connect to database
psql your-connection-string

# Set user context
SET app.user_id = 1;

# Try to query - should only see user 1's data
SELECT * FROM workspaces;

# Change user
SET app.user_id = 2;

# Query again - should see different data
SELECT * FROM workspaces;
```

### 3. Run App Tests

```bash
# Ensure DATABASE_URL is set
export DATABASE_URL=your-connection-string

# Run security tests
npx tsx scripts/test-security.ts

# Run organization tests
npx tsx scripts/test-organizations.ts
```

---

## 📊 Performance Optimization

### Connection Pooling

Already configured in `db/postgres.ts`:
```typescript
{
  max: 20,  // Max connections
  idleTimeoutMillis: 30000,  // Close idle after 30s
  connectionTimeoutMillis: 2000  // Timeout after 2s
}
```

### Indexes

All important indexes are in `postgres-schema.sql`:
- User lookups (email, id)
- Organization/workspace relationships
- Full-text search on documents
- Timestamp indexes for recent queries

### Query Optimization

```sql
-- Use EXPLAIN ANALYZE to check query performance
EXPLAIN ANALYZE 
SELECT * FROM documents 
WHERE project_id = 123;

-- Check index usage
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public';
```

---

## 🔧 Troubleshooting

### "relation does not exist"
```bash
# Schema not initialized
psql your-connection-string < db/postgres-schema.sql
```

### "permission denied"
```sql
-- Connect as superuser
psql postgres

-- Grant permissions
\c your_database
GRANT ALL ON SCHEMA public TO your_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO your_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO your_user;
```

### "SSL connection required"
```bash
# Add sslmode=require to connection string
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
```

### RLS policies blocking queries
```sql
-- Check current user
SELECT current_setting('app.user_id', true);

-- Disable RLS temporarily for testing (DANGEROUS!)
ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;

-- Re-enable
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
```

### Migration script fails
```bash
# Check SQLite database exists
ls -lh db/data.sqlite

# Check Postgres connection
psql your-connection-string -c "SELECT 1"

# Run migration with verbose output
DATABASE_URL=your-connection-string \
  DEBUG=* npx tsx scripts/migrate-to-postgres.ts
```

---

## 🚀 Deployment Checklist

### Pre-Deploy
- [ ] Postgres database created
- [ ] Schema initialized (`postgres-schema.sql`)
- [ ] Data migrated (if needed)
- [ ] DATABASE_URL set in environment
- [ ] Tests pass with Postgres
- [ ] Connection pooling configured

### Deploy
- [ ] Environment variables set
- [ ] Application deployed
- [ ] Database connection verified
- [ ] RLS policies active
- [ ] Health check endpoint working

### Post-Deploy
- [ ] Test user signup flow
- [ ] Test workspace creation
- [ ] Test document upload
- [ ] Test search functionality
- [ ] Monitor error logs
- [ ] Check database connections

---

## 📈 Scaling Tips

### When to Scale

Monitor these metrics:
- **Connection pool** exhaustion (increase `max`)
- **Query latency** > 100ms (add indexes)
- **Database size** > 10GB (upgrade plan)
- **Concurrent users** > 100 (consider read replicas)

### Horizontal Scaling

```bash
# Add read replica (Neon/Supabase/Railway)
DATABASE_READ_URL=your-read-replica-url

# Use read replica for heavy queries
import { Pool } from 'pg';
const readPool = new Pool({ 
  connectionString: process.env.DATABASE_READ_URL 
});
```

### Caching

```bash
# Add Redis for session/query caching
npm install redis
```

### Database Tuning

```sql
-- Analyze query performance
SELECT * FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;

-- Vacuum and analyze tables
VACUUM ANALYZE;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## 💰 Cost Estimation

### Small App (< 100 users)
- **Neon Free**: $0/mo
- **Vercel Free**: $0/mo
- **Total**: $0/mo

### Medium App (100-1000 users)
- **Neon Pro**: $19/mo
- **Vercel Pro**: $20/mo
- **Total**: $39/mo

### Large App (1000+ users)
- **Neon Scale**: $69/mo
- **Vercel Pro**: $20/mo
- **Total**: $89/mo

### Enterprise
- **Dedicated Postgres**: $200-500/mo
- **Vercel Enterprise**: $500/mo
- **Total**: $700-1000/mo

---

## 🎯 Next Steps

After Postgres migration:

1. **✅ Monitor Performance**
   - Set up Sentry for errors
   - Add analytics
   - Monitor database metrics

2. **✅ Add Features**
   - Email notifications
   - Real-time updates (WebSockets)
   - Advanced search (embeddings)
   - File uploads (S3/R2)

3. **✅ Security Hardening**
   - Rate limiting
   - CORS configuration
   - Security headers
   - Audit logging

4. **✅ Compliance**
   - GDPR data exports
   - Audit trails
   - Data retention policies
   - Backup strategy

---

## 📚 Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row-Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Neon Documentation](https://neon.tech/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Railway Documentation](https://docs.railway.app/)

---

## ✅ You're Production-Ready!

With Postgres + RLS, your application can now:
- ✅ Handle 1000+ concurrent users
- ✅ Automatic database-level tenant isolation
- ✅ Scale horizontally with read replicas
- ✅ Meet enterprise security requirements
- ✅ Deploy to any cloud provider

**Congratulations! You've built a production-grade SaaS application! 🎉**

