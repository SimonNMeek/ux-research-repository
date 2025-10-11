# 🚀 Production Deployment Guide - Vercel + Neon

## Overview
This guide will get your application live in production in ~30 minutes using Vercel (hosting) + Neon (PostgreSQL).

---

## 📋 Deployment Checklist

### ✅ Pre-Deployment (You've already done this!)
- [x] Security fixes (bcrypt, access control)
- [x] Organizations layer (multi-tenancy)
- [x] PostgreSQL schema with RLS
- [x] All tests passing (62/62)
- [x] Code committed to GitHub

### 🔜 Deployment Steps
- [ ] Create Neon database
- [ ] Initialize schema
- [ ] Create Vercel project
- [ ] Configure environment variables
- [ ] Deploy
- [ ] Test in production

---

## Step 1: Create Neon Database (5 minutes)

### 1.1 Sign Up for Neon
1. Go to https://neon.tech
2. Click "Sign Up"
3. Sign in with GitHub (easiest)
4. ✅ Free tier: 512MB database, perfect for starting!

### 1.2 Create Project
1. Click "**New Project**"
2. **Name:** `ux-research-repo`
3. **Region:** Choose closest to your users:
   - `US East (Ohio)` - For US users
   - `EU Central (Frankfurt)` - For EU users
   - `Asia Pacific (Singapore)` - For APAC users
4. **Postgres version:** 15 or 16 (either works)
5. Click "**Create Project**"

### 1.3 Get Connection String
1. On project page, click "**Connection Details**"
2. Copy the connection string (starts with `postgresql://`)
3. **SAVE THIS!** You'll need it for Vercel

Example:
```
postgresql://username:password@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
```

---

## Step 2: Initialize Database Schema (5 minutes)

### 2.1 Connect to Neon

**Option A: Using psql (if you have it)**
```bash
# Use your Neon connection string
psql "postgresql://username:password@ep-xxx.neon.tech/neondb?sslmode=require" \
  < db/postgres-schema.sql
```

**Option B: Using Neon SQL Editor (easiest)**
1. In Neon dashboard, click "**SQL Editor**"
2. Copy contents of `db/postgres-schema.sql`
3. Paste into SQL Editor
4. Click "**Run**"
5. ✅ Should see "Query executed successfully"

### 2.2 Verify Schema
In Neon SQL Editor, run:
```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
```

Should see:
- anonymization_audit
- anonymization_profiles
- documents
- organizations
- projects
- pseudonyms
- searches
- user_organizations
- user_preferences
- user_sessions
- user_workspaces
- users
- workspace_tags
- workspaces

✅ If you see all tables, schema is initialized!

### 2.3 Create First Admin User (Optional)
```sql
INSERT INTO users (email, name, first_name, last_name, password_hash, system_role)
VALUES (
  'your-email@example.com',
  'Your Name',
  'Your',
  'Name',
  '$2b$10$your-bcrypt-hash',  -- Use hashPassword('your-password') from app
  'super_admin'
);
```

Or just sign up through the app after deployment!

---

## Step 3: Deploy to Vercel (10 minutes)

### 3.1 Install Vercel CLI
```bash
npm install -g vercel
```

### 3.2 Login to Vercel
```bash
vercel login
```
- Choose your login method (GitHub recommended)
- Verify in browser

### 3.3 Deploy
```bash
# From your project directory
vercel

# Answer the prompts:
# ? Set up and deploy? [Y/n] → Y
# ? Which scope? → Your account/org
# ? Link to existing project? [y/N] → N
# ? What's your project's name? → ux-research-repo
# ? In which directory is your code located? → ./
# ? Want to override settings? [y/N] → N
```

This creates a **preview deployment** (not production yet).

---

## Step 4: Configure Environment Variables (5 minutes)

### 4.1 Add DATABASE_URL
```bash
vercel env add DATABASE_URL production
```

When prompted, paste your **Neon connection string**:
```
postgresql://username:password@ep-xxx.neon.tech/neondb?sslmode=require
```

### 4.2 Add Other Variables (Optional)
```bash
# Node environment
vercel env add NODE_ENV production
# Enter: production

# Session secret (optional but recommended)
vercel env add SESSION_SECRET production
# Enter: some-random-secret-string-generate-this-securely
```

### 4.3 Verify Variables
```bash
vercel env ls
```

Should show:
- `DATABASE_URL` (production)
- `NODE_ENV` (production)

---

## Step 5: Deploy to Production (2 minutes)

### 5.1 Production Deploy
```bash
vercel --prod
```

This:
- Builds your app
- Connects to Neon database
- Deploys to production URL
- ✅ Takes ~2-3 minutes

### 5.2 Get Your Production URL
After deployment:
```
✅  Production: https://ux-research-repo-xxx.vercel.app
```

**SAVE THIS URL!** This is your live application!

---

## Step 6: Test Production (5 minutes)

### 6.1 Visit Your App
Open: `https://your-app.vercel.app`

Should see your homepage!

### 6.2 Create Account
1. Click "**Create Account**"
2. Fill in your details
3. Click "**Sign Up**"
4. ✅ Should create:
   - Your user account
   - Your organization
   - Default workspace

### 6.3 Test Core Features
- [ ] Login works
- [ ] Can see workspaces
- [ ] Can create projects
- [ ] Can upload documents
- [ ] Search works
- [ ] No errors in browser console

### 6.4 Check Database
In Neon SQL Editor:
```sql
-- Check users
SELECT id, email, name FROM users;

-- Check organizations
SELECT * FROM organizations;

-- Check workspaces
SELECT * FROM workspaces;
```

✅ Should see your data!

---

## 🐛 Troubleshooting

### "Database connection failed"
- Check DATABASE_URL in Vercel environment variables
- Ensure it includes `?sslmode=require`
- Verify Neon database is running

### "Module not found"
```bash
# Redeploy
vercel --prod
```

### "RLS blocking queries"
This is normal! It means RLS is working. If you see this:
- Make sure you're logged in
- Check that user has organization access
- Verify workspace membership

### "Can't access workspaces"
```sql
-- In Neon SQL Editor, check access:
SELECT * FROM user_organizations WHERE user_id = YOUR_USER_ID;
SELECT * FROM user_workspaces WHERE user_id = YOUR_USER_ID;
```

---

## 🔧 Vercel Dashboard Tips

### View Logs
1. Go to https://vercel.com/dashboard
2. Click your project
3. Click "**Deployments**"
4. Click latest deployment
5. Click "**Logs**" tab

### Environment Variables
1. Project → "**Settings**"
2. Click "**Environment Variables**"
3. Add/edit/delete variables
4. Redeploy after changes

### Custom Domain (Optional)
1. Project → "**Settings**" → "**Domains**"
2. Add your domain
3. Update DNS records
4. ✅ Your app at your-domain.com

---

## 📊 Monitoring & Maintenance

### Check Database Health
Neon dashboard shows:
- Current connections
- Query performance
- Storage usage
- Database size

### Check Application Health
Vercel dashboard shows:
- Deployment status
- Error rate
- Response times
- Bandwidth usage

### Regular Tasks
```bash
# Redeploy (after git push)
vercel --prod

# Check logs
vercel logs

# Check environment
vercel env ls
```

---

## 💰 Cost Overview

### Current Setup (Free!)
- **Neon Free:** $0/mo
  - 512MB storage
  - 0.5GB RAM
  - Perfect for 50-100 users

- **Vercel Free:** $0/mo
  - 100GB bandwidth
  - Unlimited deploys
  - Perfect for starting out

**Total: $0/month** ✅

### When to Upgrade

**Neon Pro ($19/mo)** when:
- Database > 512MB
- Need more RAM
- Want branching (staging DBs)

**Vercel Pro ($20/mo)** when:
- Bandwidth > 100GB/mo
- Need team collaboration
- Want custom domains

---

## 🎯 Post-Deployment Steps

### 1. Set Up Custom Domain (Optional)
- Buy domain (Namecheap, Cloudflare, etc.)
- Add to Vercel
- Update DNS

### 2. Add Monitoring
- Sentry for errors
- PostHog for analytics
- LogRocket for session replay

### 3. Set Up Backups
Neon has automatic backups, but you can also:
```bash
# Manual backup
pg_dump your-neon-url > backup-$(date +%Y%m%d).sql
```

### 4. Create Staging Environment
```bash
# Create staging deployment
vercel env add DATABASE_URL preview
# Enter: your-neon-connection-string

# Deploy to preview
vercel
```

---

## 📧 Email Setup (For Invitations - Optional)

### Option 1: Resend (Easiest)
```bash
npm install resend

# Add to .env
RESEND_API_KEY=your-key
```

### Option 2: SendGrid
```bash
npm install @sendgrid/mail

# Add to .env
SENDGRID_API_KEY=your-key
```

Then update invitation flow to send emails!

---

## 🔐 Security Checklist

Before going live:
- [ ] Change all default passwords
- [ ] Add rate limiting
- [ ] Set up CORS properly
- [ ] Add security headers
- [ ] Enable HTTPS (automatic with Vercel)
- [ ] Test RLS in production
- [ ] Set up error monitoring

---

## 🎉 You're Live!

After deployment, you'll have:
- ✅ Production URL (https://your-app.vercel.app)
- ✅ Secure multi-tenant application
- ✅ PostgreSQL with RLS
- ✅ Ready for customers
- ✅ Can start charging money!

---

## 📞 Quick Reference

### Useful Commands
```bash
# Deploy to production
vercel --prod

# View logs
vercel logs --follow

# Check environment
vercel env ls

# Run locally with production DB
DATABASE_URL=your-neon-url npm run dev
```

### Useful URLs
- Vercel Dashboard: https://vercel.com/dashboard
- Neon Dashboard: https://console.neon.tech
- GitHub Repo: https://github.com/SimonNMeek/ux-research-repository

---

## 🆘 Need Help?

- Vercel Docs: https://vercel.com/docs
- Neon Docs: https://neon.tech/docs
- Next.js Docs: https://nextjs.org/docs

---

**Ready? Let's deploy! Follow the steps above and let me know if you hit any issues!** 🚀

