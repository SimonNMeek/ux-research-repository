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
3. Deploy to Vercel
4. Run `npm run test:health:prod`
5. Update `SYSTEM-HEALTH.md`

## 💡 **Context Management**
- Always check `SYSTEM-HEALTH.md` first
- Run health checks before starting work
- Use test results to understand system state
- Document all changes with risk assessment

---

**Remember: The system is fragile. Always test before and after changes.**
