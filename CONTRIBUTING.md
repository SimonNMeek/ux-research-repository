# Contributing to Sol

Welcome! This guide will help you collaborate on Sol (UX Research Repository) even if you're not super technical.

## First-Time Setup

### 1. Install Required Software

- **Cursor**: Download from [cursor.sh](https://cursor.sh) - It's like VS Code with AI
- **Node.js**: Download from [nodejs.org](https://nodejs.org) - Choose the LTS version

### 2. Get the Code

1. Open Cursor
2. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows)
3. Type "Git: Clone" and press Enter
4. Paste: `https://github.com/SimonNMeek/ux-research-repository.git`
5. Choose where to save it on your computer

### 3. Install Dependencies

1. Open the terminal in Cursor (`` Cmd+` `` or `` Ctrl+` ``)
2. Type: `npm install`
3. Wait for it to finish (might take a minute)

### 4. Start the Application

1. **Start the main app:**
   ```bash
   npm run dev
   ```
   Open your browser to: `http://localhost:3000`
   You should see the Sol interface!

2. **Start the MCP server (for Claude integration):**
   ```bash
   # Open a new terminal window/tab
   cd mcp
   npm start
   ```
   Should show: "MCP server running on port 3001"

3. **Configure Claude Desktop:**
   - Open Claude Desktop
   - Go to Settings → Developer
   - Add MCP server: `http://localhost:3001`
   - Restart Claude Desktop

4. **Test the connection:**
   - Ask Claude: "Hey Sol, what can you do?"
   - Should trigger the onboarding flow
   - If you get generic responses, see troubleshooting below

## Working Together

### Option A: Take Turns (Simplest - Start Here!)

**Before you start working:**
```bash
git pull origin main
```
This gets your partner's latest changes.

**While working:**
- Make your changes
- Test them at `http://localhost:3000`
- Save files in Cursor (Cmd+S / Ctrl+S)

**When you're done:**
```bash
git add -A
git commit -m "Brief description of what you changed"
git push origin main
```

**Tell your partner**: "I just pushed changes - pull before you start!"

### Option B: Feature Branches (When You're Comfortable)

**Starting a new feature:**
```bash
git checkout -b yourname/what-youre-doing
# Example: git checkout -b sarah/improve-search
```

**Working on it:**
- Make changes, commit regularly
- Push your branch: `git push origin yourname/what-youre-doing`

**When ready to merge:**
1. Go to GitHub.com → Your repository
2. Click "Pull Requests" → "New Pull Request"
3. Select your branch → `main`
4. Click "Create Pull Request"
5. Partner reviews and clicks "Merge Pull Request"

**Getting back to main:**
```bash
git checkout main
git pull origin main
```

## Avoiding Conflicts

### Coordinate Who's Working On:
- ❌ **Database uploads** - Only one person at a time
- ❌ **Same file** - Don't both edit `app/page.tsx` simultaneously

### Safe to Work on Separately:
- ✅ **Different files** - You edit `page.tsx`, partner edits `route.ts`
- ✅ **Documentation** - Different markdown files
- ✅ **Different features** - UI vs anonymization vs MCP

### Communication
- **Before starting**: "I'm working on the search feature"
- **After pushing**: "Just pushed changes to the upload UI"
- **If stuck**: Share screenshot or error message

## Common Commands

### Everyday Use
```bash
# See what you changed
git status

# Get latest changes (do this OFTEN!)
git pull origin main

# Save your work
git add -A
git commit -m "What you changed"
git push origin main

# See recent changes
git log --oneline -10
```

### When Things Go Wrong

**"Someone else pushed changes, I can't push!"**
```bash
git pull origin main
# If there are conflicts, Cursor will highlight them
# Fix the conflicts, then:
git add -A
git commit -m "Merge changes"
git push origin main
```

**"I messed up, want to undo my changes"**
```bash
# Undo all local changes (careful!)
git restore .

# Just undo one file
git restore path/to/file.tsx
```

**"I want to see what I changed"**
```bash
git diff
```

**"I want to go back to an earlier version"**
```bash
git log --oneline
git checkout <commit-hash>
# Look around, then come back with:
git checkout main
```

### Making a Backup Before Big Changes
```bash
git checkout -b backup-just-in-case
git push origin backup-just-in-case
git checkout main
```

Now you have a safety copy on GitHub!

## What to Commit

### ✅ DO commit:
- Code changes (`.ts`, `.tsx`, `.css` files)
- Documentation updates (`README.md`, `.md` files)
- Configuration changes (`package.json`, `tsconfig.json`)
- New files you create

### ❌ DON'T commit:
- `node_modules/` folder (too big, auto-generated)
- `.next/` folder (build artifacts, auto-generated)
- Personal API keys or secrets
- Large binary files

These are already in `.gitignore` so Git will ignore them automatically.

## Testing Your Changes

Before pushing, always:

1. **Run the app**: `npm run dev`
2. **Check it works**: Test in browser at `http://localhost:3000`
3. **Try key features**:
   - Upload a file
   - Search for something
   - Add tags
   - View anonymization preview
4. **Check for errors**: Look at terminal for red error messages

## Working on Specific Features

### UI/Design Changes
- Files: `app/page.tsx`, `app/globals.css`, `components/`
- Test: Visual changes in browser
- Safe to work on simultaneously if editing different components

### Backend/API Changes
- Files: `app/api/`, `db/`
- Test: Upload files, search, tag operations
- Coordinate to avoid conflicts

### Anonymization Engine
- Files: `packages/anonymizer/src/`
- Test: Upload file with PII, check anonymization
- After changes: `cd packages/anonymizer && npm run build`

### MCP/Claude Integration
- Files: `mcp/server.ts`, `mcp/docs/`
- Test: Ask Claude questions about Sol
- Restart MCP server after changes

**⚠️ Common Issues & Solutions:**

**"Server disconnected" or "Connection failed" errors:**
1. **Check if MCP server is running:**
   ```bash
   # In the mcp/ directory
   cd mcp
   npm start
   # Should show: "MCP server running on port 3001"
   ```

2. **If port 3001 is busy:**
   ```bash
   # Kill any existing MCP processes
   pkill -f "mcp"
   # Or find and kill manually:
   lsof -ti:3001 | xargs kill -9
   ```

3. **Restart MCP server:**
   ```bash
   cd mcp
   npm start
   ```

4. **Check Claude Desktop settings:**
   - Open Claude Desktop
   - Go to Settings → Developer
   - Make sure MCP server is configured:
     - Server: `http://localhost:3001`
     - Or check if it's using a different port

5. **If still having issues:**
   ```bash
   # Check what's running on port 3001
   lsof -i :3001
   
   # Check MCP server logs for errors
   cd mcp
   npm start
   # Look for error messages in the terminal
   ```

**"MCP tools not available" in Claude:**
- Make sure MCP server is running (`npm start` in mcp/ directory)
- Restart Claude Desktop completely
- Check Claude Desktop → Settings → Developer → MCP servers
- Verify the server URL is correct

**Testing MCP connection:**
- Ask Claude: "Hey Sol, what can you do?"
- Should trigger the onboarding flow
- If you get generic responses, MCP isn't connected properly

## Getting Help

### Error Messages
1. Read the error in the terminal
2. Copy the full error message
3. Ask Cursor AI: "What does this error mean?"
4. Share with partner if stuck

### Git Confusion
```bash
# See where you are
git status

# See what branches exist
git branch -a

# Get back to main branch
git checkout main
```

### Nuclear Option (Start Fresh)
```bash
# Save your work first!
git stash

# Get completely fresh copy
git fetch origin
git reset --hard origin/main

# If you want your work back
git stash pop
```

## Commit Message Tips

**Good commit messages:**
- ✅ "Add favorite button to file cards"
- ✅ "Fix search not finding partial matches"
- ✅ "Update anonymization to detect speaker labels"

**Bad commit messages:**
- ❌ "Updates"
- ❌ "Fixed stuff"
- ❌ "asdfasdf"

## Quick Reference Card

```bash
# Morning routine
git pull origin main
npm run dev
# In another terminal:
cd mcp && npm start

# Working
# ... make changes ...
# ... test in browser ...
# ... test Claude integration ...

# Saving work
git add -A
git commit -m "Clear description"
git push origin main

# Evening routine
git push origin main
# Tell partner you pushed!
```

**MCP Server Quick Commands:**
```bash
# Start MCP server
cd mcp && npm start

# Stop MCP server
pkill -f "mcp"

# Check if running
lsof -i :3001

# Restart if having issues
pkill -f "mcp" && cd mcp && npm start
```

## Questions?

- **Git confused?** → `git status` shows what's happening
- **Code not working?** → Check terminal for errors
- **Lost changes?** → `git log` shows history, can go back
- **Totally stuck?** → Ask in Slack/Discord, or create GitHub Issue

## Pro Tips

1. **Commit often** - Small commits are easier to understand
2. **Pull frequently** - Get partner's changes early
3. **Test before pushing** - Make sure it works!
4. **Write clear commit messages** - Future you will thank you
5. **Communicate** - "I'm working on X" prevents conflicts
6. **Backup before experiments** - Create a branch first

---

Remember: Git is **version control**, not **version chaos**. When in doubt:
1. Commit your work
2. Push to a branch
3. Ask for help

You can always undo, restore, or go back. Nothing is permanent! 🎉

