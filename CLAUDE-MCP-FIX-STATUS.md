# Claude Remote MCP Connector - Current Status

## ✅ What's Working

1. **Discovery Endpoints** - Fixed and deployed to Fly.io ✅
   - Configure screen now populates correctly
   - All tools are listed
   - Auth configuration is correct

2. **Search Endpoint Fix** - Fixed in code but **not yet deployed to production** ⚠️
   - Fixed `content_preview` → `body` column issue
   - Added better error logging
   - Committed to `feat/agent-upgrade-quickwins` branch

## ⚠️ Current Issue: Search Tool Failing

**Problem:** Search queries are failing with "Search failed" error

**Root Cause:** 
- Production Vercel app (`ux-repo-web.vercel.app`) still has old code with `content_preview` column
- The fix is in the feature branch but needs to be merged to `main` and deployed

**Workaround Available:**
Claude can use `list_documents` tool instead:
- Tool name: `list_documents`
- Parameters: `{ workspace_slug: "supadupa-app" }` (or whatever workspace exists)
- This will list recent documents without needing search

## 🚀 Deployment Steps Needed

1. **Merge to main:**
   ```bash
   git checkout main
   git merge feat/agent-upgrade-quickwins
   git push
   ```

2. **Vercel will auto-deploy** from `main` branch

3. **Test again** - Search should work after deployment

## 📋 Quick Test Commands

After deployment, test:
```bash
curl -X GET "https://ux-repo-web.vercel.app/api/mcp/search?q=farm&workspace=supadupa-app" \
  -H "Authorization: Bearer sk-qb85RiisZTwwgMjNM14eyFM7wHQN0CbGLFjlLOvwAjrTQ4sq"
```

Should return results instead of `{"error":"Search failed"}`

## 💡 For Claude Right Now

Claude should try using `list_documents` instead of `search`:
- Use `list_documents` with `workspace_slug` parameter
- This will show all documents in the workspace
- Then Claude can read specific documents by ID if needed

