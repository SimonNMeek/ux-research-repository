# AI Assistant Feature - Implementation Summary

## Overview
The AI Assistant is an in-app research assistant that uses OpenAI's GPT-4o model with Model Context Protocol (MCP) integration to help users explore, analyze, and synthesize insights from their research documents within workspaces.

## Key Features Implemented

### 1. MCP Integration
- **Endpoint**: `/api/agent-mcp`
- **Model**: Upgraded from `gpt-4o-mini` to `gpt-4o` for better reasoning and selectivity
- **Architecture**: Uses OpenAI function calling to orchestrate MCP tools dynamically
- **Tool Support**: 
  - `list_projects` - List all projects in a workspace
  - `list_documents` - List documents (optionally filtered by project)
  - `search` - Full-text search with project filtering
  - `get_document` - Retrieve full document content

### 2. Smart Tool Selection & Filtering
- **System Prompt**: Enhanced to be highly selective and analytical
- **Tool Selection Logic**:
  - For specific document types (interviews, surveys): Uses `search` tool with keywords
  - For listing all documents: Uses `list_documents` then filters results
  - Strict filtering excludes irrelevant documents (e.g., pNPS, CSAT when asked for interviews)
- **Document Analysis**: Analyzes document titles to determine relevance

### 3. UI Components & Layout

#### Panel Modes
- **Mobile (Overlay Mode)**: Full-screen overlay that slides in from right
- **Desktop (Push Mode)**: Panel pushes content, starts below header, expands to full height when header scrolls away

#### Visual Features
- **Icon**: Sparkles icon (replacing robot icon) for modern, engaging feel
- **Responsive Design**: Adapts between overlay (mobile) and push (desktop) modes
- **Resizable Panel**: Drag handle on left edge to adjust width (320px - 50% viewport)
- **Smooth Animations**: 200ms slide-in from right with fade effect

#### State Persistence
- **Conversation History**: Saved to `localStorage` (keyed by workspace slug)
- **Panel Width**: Saved to `localStorage` (`ai-assistant-panel-width`)
- **Panel Open State**: Saved to `localStorage` (keyed by workspace slug)
- **Cross-Navigation**: Panel state persists when navigating within a workspace

### 4. Save Insights Feature
- **Save Button**: Bookmark icon next to Copy button on assistant messages
- **Save Dialog**: 
  - Title field (auto-generated from message content with timestamp)
  - Project selector dropdown
  - Option to create new project (if user has permissions)
  - New project form (name and description)
- **Document Creation**: 
  - Saves as markdown document
  - Tags with `"synthesized-insight"` for easy identification
  - Automatically refreshes workspace projects list when new project created

### 5. UX Improvements
- **Button Hiding**: "Ask about..." button hides when panel is open
- **Header Detection**: Panel adjusts height when header scrolls out of view
- **Copy Functionality**: One-click copy for assistant responses
- **Clear Conversation**: Trash icon to clear conversation history

## Technical Implementation

### File Structure
```
components/
  AIAssistant.tsx          # Main component (1156 lines)
  
app/api/
  agent-mcp/route.ts       # OpenAI orchestration endpoint
  mcp/route.ts            # MCP tool definitions
  claude-tool/route.ts    # MCP tool routing
  mcp/search/route.ts     # Search endpoint (supports project filtering)
```

### Key Components

#### AIAssistant Component (`components/AIAssistant.tsx`)
- **Props**:
  - `workspaceSlug`: string
  - `workspaceName`: string
  - `isOpen`: boolean
  - `onClose`: () => void
  - `onProjectCreated?`: () => void (callback when project created)

- **State Management**:
  - Messages (localStorage-persisted)
  - Panel width (localStorage-persisted)
  - Panel open state (localStorage-persisted)
  - Mobile detection
  - Header visibility (IntersectionObserver)
  - Save dialog state

#### Agent MCP Endpoint (`app/api/agent-mcp/route.ts`)
- **Model**: `gpt-4o`
- **Temperature**: 0.1 (for consistent, focused responses)
- **Max Tokens**: 3000
- **Tool Orchestration**: 
  - Sequential tool calling (up to 5 iterations)
  - Automatic workspace_slug injection
  - Error handling with fallbacks

### System Prompt Enhancements
The system prompt emphasizes:
- **Selectivity**: Only include documents that match the query
- **Analysis**: Analyze document titles and content for relevance
- **Tool Selection**: Prefer `search` for specific document types
- **Filtering**: Strict filtering when using `list_documents`
- **Response Format**: Structured, grouped, concise summaries

### Tool Descriptions Updated
- **`search`**: Explicitly guides model to use for specific document types
- **`list_documents`**: Warns that results are unfiltered, must filter manually
- Added `project_slug` parameter to `search` tool

## Configuration

### Environment Variables
- `OPENAI_API_KEY`: Platform-wide key for orchestration
- `MCP_API_KEY`: Org-scoped key for MCP tool authentication

### API Endpoints
- `POST /api/agent-mcp`: Main assistant endpoint
- `GET /w/[ws]/api/projects`: List projects (for save dialog)
- `POST /w/[ws]/api/projects`: Create project (if permissions allow)
- `POST /w/[ws]/api/projects/[slug]/documents`: Create document

## User Experience Flow

1. **Opening Assistant**: Click "Ask about [Workspace]" button
2. **Panel Animates**: Slides in from right with fade (200ms)
3. **Conversation**: Chat with assistant about research
4. **Saving Insights**: Click bookmark icon, select/create project, save
5. **Persistence**: Conversation and panel state saved across sessions
6. **Navigation**: Panel persists when navigating within workspace

## Improvements Made During Development

1. **Model Upgrade**: `gpt-4o-mini` → `gpt-4o` for better selectivity
2. **Icon Change**: Robot → Sparkles for modern feel
3. **Copy Button**: Added with icon-only design
4. **Save Feature**: Full save dialog with project creation
5. **Animations**: Slide-in with fade effect
6. **Selectivity**: Enhanced filtering to exclude irrelevant documents
7. **Button Hiding**: Hide trigger button when panel open
8. **Header Awareness**: Panel adjusts when header scrolls away

## Known Limitations

1. **Project Creation**: Requires owner/admin permissions (enforced server-side)
2. **Document Creation**: Requires member+ permissions (enforced server-side)
3. **Model Costs**: Using `gpt-4o` is more expensive than `gpt-4o-mini`
4. **Animation**: Only animates on open (not on close) due to React unmounting

## Future Enhancements

1. **Close Animation**: Implement exit animations before unmount
2. **Toast Notifications**: Replace `alert()` calls with toast library
3. **Export Conversations**: Allow exporting conversation history
4. **Conversation Templates**: Pre-built prompts for common tasks
5. **Multi-Workspace Support**: Cross-workspace queries
6. **Document Linking**: Link assistant insights back to source documents

## Testing Checklist

- [x] Panel opens/closes correctly
- [x] Animation works smoothly
- [x] Conversation persists across sessions
- [x] Panel width persists
- [x] Save dialog works
- [x] Project creation works
- [x] New projects appear immediately
- [x] Button hides when panel open
- [x] Header detection works
- [x] Mobile/desktop mode switching
- [x] Selective document filtering
- [ ] Health check integration
- [ ] Error handling for API failures
- [ ] Rate limiting handling

