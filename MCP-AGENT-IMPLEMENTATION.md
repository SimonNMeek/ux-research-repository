# MCP Agent Implementation

## Executive Summary

We've successfully integrated the Model Context Protocol (MCP) into the in-app AI assistant, allowing it to use the same powerful tooling that works with ChatGPT. Users can now ask complex research questions and get intelligent, multi-document synthesis—just like ChatGPT + MCP, but directly in the app.

## What Was Built

### Core Components

1. **`/api/agent-mcp/route.ts`** — Smart proxy that orchestrates MCP tools using OpenAI
   - Fetches available MCP tools dynamically
   - Uses OpenAI function calling to decide which tools to call
   - Handles sequential tool calls (e.g., find project → list documents)
   - Synthesizes tool results into clear responses

2. **`/api/mcp/route.ts`** — Enhanced MCP server
   - Added `list_documents` tool to the tools list
   - Fixed tool call format (was using `action`, now uses `tool_name` and `parameters`)

3. **`/api/claude-tool/route.ts`** — Enhanced routing
   - Made `project_slug` optional in `list_documents` handler
   - Added `limit` parameter support

4. **UI Toggle** — `components/AIAssistant.tsx`
   - Added "Use MCP (server proxy)" checkbox
   - Switches between `/api/mcp-ai` (old) and `/api/agent-mcp` (new)

## How It Works

### Architecture Flow

```
User Query → AIAssistant.tsx → /api/agent-mcp
                                          ↓
                            OpenAI (gpt-4o-mini) decides which tools to call
                                          ↓
                            Calls MCP tools via /api/mcp → /api/claude-tool
                                          ↓
                            Tool results returned to OpenAI
                                          ↓
                            OpenAI synthesizes final response
                                          ↓
                            Returns to user
```

### Key Features

1. **Sequential Tool Calls**
   - First call: `list_projects` to find project slug
   - Second call: `list_documents` with that slug
   - Can chain multiple operations

2. **Intelligent Tool Selection**
   - OpenAI analyzes user query
   - Automatically selects appropriate MCP tools
   - Handles multi-step workflows

3. **Multi-Document Synthesis**
   - Can search across all documents
   - Synthesizes insights from multiple sources
   - Provides research-backed conclusions

### Example Query Flow

**User:** "List documents in SupaDupa User Research"

1. OpenAI receives query + system prompt
2. Decides to call `list_projects` first (to find project slug)
3. Gets result: `{"slug": "supadupa-user-research", ...}`
4. Extracts project slug from result
5. Decides to call `list_documents` with `project_slug: "supadupa-user-research"`
6. Gets documents list
7. Synthesizes final response listing the documents

**User:** "What are the top 3 friction points?"

1. OpenAI calls `search` with query about friction points
2. Gets multiple relevant documents
3. Analyzes content across documents
4. Identifies patterns (motivation, complexity, tone)
5. Synthesizes top 3 with examples
6. Returns formatted answer

## Configuration

### Environment Variables

```bash
# Required: Platform-wide OpenAI key for tool orchestration
OPENAI_API_KEY=sk-your-key-here

# Required: Org-scoped MCP API key (for MCP tool authentication)
# Note: Currently uses env fallback, ideally passed from frontend
MCP_API_KEY=sk-org-key-here
```

**Important:** 
- `OPENAI_API_KEY` is platform-wide (one key for all orgs) — used for orchestration
- `MCP_API_KEY` is org-scoped (different per org) — used for data access authentication
- These serve different purposes and both are needed

### Database

- MCP API keys stored in `api_keys` table with `organization_id`
- Keys are org-scoped for data isolation

## API Endpoints

### `/api/agent-mcp` (POST)

**Request:**
```json
{
  "message": "List documents in User Research",
  "workspaceSlug": "supadupa-app"
}
```

**Response:**
```json
{
  "response": "Here are the documents in User Research:\n\n1. checkout_interview1.txt\n..."
}
```

**Flow:**
1. Validates workspace exists
2. Fetches available MCP tools
3. Converts to OpenAI function format
4. Uses OpenAI to decide tool calls
5. Executes tools sequentially if needed
6. Synthesizes final response
7. Returns formatted answer

### `/api/mcp` (POST)

MCP protocol endpoint that:
- Lists available tools (`tools/list`)
- Executes tool calls (`tools/call`)
- Routes to `/api/claude-tool` with proper authentication

### `/api/claude-tool` (POST)

Routes tool calls to appropriate endpoints:
- `list_projects` → `/api/mcp/projects`
- `list_documents` → `/api/mcp/documents`
- `search` → `/api/mcp/search`
- `get_document` → `/api/mcp/documents?id=...`

## Available MCP Tools

1. **`list_workspaces`** — List all workspaces
2. **`list_projects`** — List projects in a workspace (requires `workspace_slug`)
3. **`list_documents`** — List documents, optionally filtered by project (requires `workspace_slug`, optional `project_slug`)
4. **`search`** — Search across documents (requires `query`, optional `workspace_slug`)
5. **`get_document`** — Get full document content (requires `document_id`)
6. **`create_document`** — Create new document
7. **`update_document`** — Update existing document

## System Prompt Logic

The system prompt guides OpenAI to:
- Use `list_projects` first to find project slugs
- Use `list_documents` for listing documents (not `search`)
- Use `search` for finding specific content
- Always include `workspace_slug` when required
- Chain tools sequentially when needed

## Error Handling

1. **Tool Call Failures**
   - Captures errors, returns error object
   - Continues with other tools if multiple calls
   - Logs errors for debugging

2. **Synthesis Failures**
   - If OpenAI can't synthesize, returns raw tool results
   - Formats results for readability
   - Provides helpful error messages

3. **Maximum Iterations**
   - Limits sequential tool calls to 5 iterations
   - Prevents infinite loops
   - Falls back gracefully

## Differences from ChatGPT + MCP

| Aspect | ChatGPT + MCP | In-App Agent |
|--------|--------------|--------------|
| AI Orchestration | ChatGPT native | OpenAI API (gpt-4o-mini) |
| Tools | Same MCP tools | Same MCP tools |
| Auth | MCP API key | MCP API key (org-scoped) |
| Experience | External app | Built into platform |
| Cost | User's ChatGPT | Platform's OpenAI key |

**Key Insight:** Both use the same MCP tools and authentication, so they provide similar capabilities. The main difference is who runs the orchestration (ChatGPT vs our OpenAI API).

## Testing

### Test Queries

1. **Simple listing:**
   - "List documents in SupaDupa User Research"
   - Should: Find project → List documents

2. **Complex synthesis:**
   - "What are the top 3 friction points?"
   - Should: Search documents → Synthesize insights → Provide answer

3. **Multi-step:**
   - "List checkout interviews then summarize them"
   - Should: Find project → List documents → Get content → Summarize

### Verification

Check server logs for:
- `Tool list_projects succeeded`
- `Tool list_documents succeeded`
- `Tool search succeeded`

## Troubleshooting

### Issue: "OPENAI_API_KEY not configured"
**Fix:** Add `OPENAI_API_KEY=sk-...` to `.env.local`

### Issue: "MCP_API_KEY not configured"
**Fix:** Add `MCP_API_KEY=sk-...` to `.env.local` (temporary fallback)

### Issue: "Unable to process tool results"
**Check:**
- Server logs for tool call errors
- MCP_API_KEY is valid
- Workspace exists in database

### Issue: Agent calls wrong tool
**Fix:** Check system prompt in `/api/agent-mcp/route.ts` — may need refinement

### Issue: No sequential calls (only one tool)
**Fix:** Check loop logic — should continue if `currentMessage.tool_calls` exists

## Future Improvements

1. **Frontend Integration**
   - Pass org's MCP_API_KEY from frontend (not env)
   - Store keys in database, retrieve based on user session

2. **Tool Selection**
   - Improve system prompt based on usage patterns
   - Add tool usage analytics

3. **Performance**
   - Cache tool results when appropriate
   - Optimize sequential call patterns

4. **Features**
   - Support more MCP tools as they're added
   - Better synthesis formatting
   - Source citations in responses

5. **Error Handling**
   - Retry logic for transient failures
   - Better user-facing error messages

## Files Modified/Created

- **Created:** `app/api/agent-mcp/route.ts` — Main orchestration endpoint
- **Modified:** `app/api/mcp/route.ts` — Added `list_documents` tool, fixed format
- **Modified:** `app/api/claude-tool/route.ts` — Made `project_slug` optional
- **Modified:** `components/AIAssistant.tsx` — Added MCP toggle
- **Created:** `CONTEXT-FOR-DEVELOPERS.md` — System context guide
- **Created:** `INCIDENT-RCA.md` — Database config loss RCA
- **Created:** This file — Implementation documentation

## Key Decisions

1. **One OpenAI Key for All Orgs**
   - Orchestration doesn't access data, so one key is safe
   - Reduces complexity and cost
   - Org isolation maintained via MCP_API_KEY

2. **Sequential Tool Calls in Loop**
   - Allows multi-step workflows
   - More flexible than single-pass execution
   - Better matches ChatGPT behavior

3. **Fallback to Raw Results**
   - If synthesis fails, show tool results
   - Better than cryptic errors
   - User can still get useful information

4. **MCP Tool Format Fix**
   - Changed from `action` to `tool_name`
   - Changed from spread args to `parameters` object
   - Matches `/api/claude-tool` expectations

## Related Documentation

- `CONTEXT-FOR-DEVELOPERS.md` — System architecture overview
- `INCIDENT-RCA.md` — Database configuration issues
- `SYSTEM-INSTRUCTIONS.md` — Platform health checks
- `AI-ASSISTANT-SETUP.md` — Original agent setup

## Quick Reference

**To use MCP agent:**
1. Enable "Use MCP (server proxy)" toggle in UI
2. Ask natural language questions
3. Agent automatically selects and chains tools

**To debug:**
1. Check server logs for tool calls
2. Verify OPENAI_API_KEY and MCP_API_KEY in env
3. Test individual tools via `/api/mcp` directly

**To extend:**
1. Add new tool to `/api/mcp` tools list
2. Add handler to `/api/claude-tool`
3. Update system prompt if tool needs special guidance

