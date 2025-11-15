# Claude Web Remote MCP Setup Guide

Complete guide for connecting Sol Research to Claude Web using Remote MCP.

## Overview

This guide explains how to set up the Sol Research Remote MCP server for use with Claude Web. The Remote MCP server is deployed at `https://sol-research-mcp.fly.dev` and allows Claude Web to access your research data through the Model Context Protocol.

## Prerequisites

1. **Sol Research Account**: You need an account at https://ux-repo-web.vercel.app
2. **API Key**: You need a Sol Research API key (user-scoped or organization-scoped)
3. **Claude Web Access**: You need access to Claude Web (claude.ai)

## Getting Your API Key

1. Log in to Sol Research at https://ux-repo-web.vercel.app
2. Click your avatar → **API Keys**
3. Click **Create API Key**
4. Give it a name (e.g., "Claude Web Integration")
5. **Copy the key immediately** - it starts with `sk-` and you won't see it again!

## Setting Up the Remote MCP Connector in Claude Web

### Step 1: Open Claude Web Settings

1. Go to https://claude.ai
2. Click the **gear icon** (⚙️) in the top right
3. Navigate to **Remote MCP** or **Connectors**

### Step 2: Add Custom Connector

1. Click **"Add custom connector"** or **"Add connector"**
2. You'll see a dialog with:
   - **Name**: Enter "Sol Research" (or any name you prefer)
   - **Remote MCP server URL**: Enter your server URL **with API key**

### Step 3: Configure the Server URL

**Important**: Claude Web doesn't have a separate API key field, so you must include your API key in the URL as a query parameter.

Enter the Remote MCP server URL in this format:

```
https://sol-research-mcp.fly.dev/?api_key=sk-YOUR_API_KEY_HERE
```

Replace `sk-YOUR_API_KEY_HERE` with your actual API key (the one that starts with `sk-`).

**Example:**
```
https://sol-research-mcp.fly.dev/?api_key=sk-4HYKkbZANxQ7mK3j9L2vR8pW5nB6cF1dE3gH4iJ5kL6
```

### Step 4: Save the Connector

1. Click **"Add"** to save the connector
2. The connector should now appear in your list of connectors

## How It Works

### Authentication Flow

1. **Discovery Phase**: Claude Web calls `/.well-known/mcp` endpoint (no auth required)
   - Server responds with `auth: { required: false }` so Claude shows the configure screen

2. **Initialization**: Claude Web calls `/initialize` endpoint
   - Server extracts API key from URL query parameter (`?api_key=...`)
   - Stores API key in session storage for future requests

3. **Tool Calls**: When you use tools, Claude Web calls `/tools/call` endpoint
   - Server checks multiple sources for API key (in priority order):
     1. Authorization header (if sent)
     2. `req.apiKeyFromUrl` (extracted from URL query parameter)
     3. URL query parameter (parsed from `req.url`)
     4. Request params
     5. Session storage (from initialization)
   - Uses API key to authenticate with Sol Research API

### Available Tools

Once connected, Claude can use these tools:

1. **get_sol_info** - Get information about Sol Research platform
2. **auto_setup_workspace** - Automatically set up with main workspace
3. **list_workspaces** - List all workspaces in your organization
4. **list_projects** - List projects in a workspace
5. **search** - Search across documents and projects
6. **get_document** - Get full content of a specific document
7. **create_document** - Create a new document in a project
8. **update_document** - Update an existing document
9. **set_user_preference** - Set user preferences for role and workflows
10. **get_user_preference** - Get user preferences

## Testing the Connection

Once configured, test the connection by asking Claude:

- "List all my workspaces"
- "Show me projects in Farm to Fork workspace"
- "Search for user feedback about checkout"
- "Get document with ID 123"

If everything is working, Claude should be able to access your research data!

## Troubleshooting

### Connection Issues

**Problem**: "Error occurred during tool execution" or all tools failing

**Solutions**:
1. **Check API key in URL**: Make sure your Remote MCP server URL includes `?api_key=sk-...`
2. **Verify API key**: Test your API key directly:
   ```bash
   curl -H "Authorization: Bearer sk-YOUR_KEY" \
     https://ux-repo-web.vercel.app/api/mcp/workspaces
   ```
3. **Check server status**: Verify the server is running:
   ```bash
   curl https://sol-research-mcp.fly.dev/health
   ```
   Should return: `{"status":"healthy",...}`

### Authentication Errors

**Problem**: "Authentication required" or "Missing API key"

**Solutions**:
1. **Reconnect connector**: Disconnect and reconnect the connector in Claude Web
2. **Verify URL format**: Make sure the URL is exactly:
   ```
   https://sol-research-mcp.fly.dev/?api_key=sk-YOUR_KEY
   ```
   (No spaces, correct parameter name)
3. **Check API key format**: API key should start with `sk-` and be 50+ characters
4. **Try regenerating API key**: Create a new API key in Sol Research and update the connector

### Tools Not Showing

**Problem**: Configure screen is blank or tools don't appear

**Solutions**:
1. **Check server logs**: The server logs all requests. Check Fly.io logs:
   ```bash
   fly logs --app sol-research-mcp
   ```
2. **Verify discovery endpoint**: Test manually:
   ```bash
   curl https://sol-research-mcp.fly.dev/.well-known/mcp
   ```
   Should return JSON with `auth: { required: false, ... }`
3. **Clear browser cache**: Try in incognito mode or clear cache
4. **Reconnect connector**: Disconnect and reconnect

### Empty Workspaces List

**Problem**: Workspaces list is empty

**Solutions**:
1. **Check API key scope**: Make sure your API key has access to workspaces
   - User-scoped keys: Access to workspaces where user is a member
   - Organization-scoped keys: Access to all workspaces in the organization
2. **Verify API key**: Test directly with the API:
   ```bash
   curl -H "Authorization: Bearer sk-YOUR_KEY" \
     https://ux-repo-web.vercel.app/api/mcp/workspaces
   ```
3. **Check organization membership**: If using organization-scoped key, verify you have workspaces in that organization

## Server Architecture

### Endpoints

- **`/.well-known/mcp`** - Discovery endpoint (returns server info, auth requirements)
- **`/mcp`** - Alternative discovery/info endpoint
- **`/`** or **`/mcp`** (POST) - Main MCP protocol endpoint
  - Handles: `initialize`, `tools/list`, `tools/call`, etc.
- **`/health`** - Health check endpoint

### Authentication Methods Supported

The server accepts API keys from multiple sources (checked in order):

1. **Authorization Header**: `Authorization: Bearer sk-...` (standard, not used by Claude Web)
2. **URL Query Parameter**: `?api_key=sk-...` (used by Claude Web)
3. **Request Params**: In JSON-RPC `params` object
4. **Session Storage**: Stored during `initialize` call

### Session Management

- API keys are stored in memory per session
- Session ID is managed via `MCP-Session-Id` header
- Each session maintains its own API key

## Security Considerations

### API Key in URL

**Note**: Since Claude Web doesn't provide an API key field, we accept the key in the URL query parameter. This means:

- ✅ The key is sent over HTTPS (encrypted)
- ✅ It's stored in Claude Web's settings (only you can see it)
- ⚠️ The key is visible in the URL (but only in Claude Web's settings UI)
- ⚠️ It's stored in session memory on the server (not persisted to disk)

### Best Practices

1. **Use Organization API Keys**: If possible, use organization-scoped API keys instead of user keys
2. **Rotate Keys**: Regularly regenerate API keys for security
3. **Monitor Usage**: Check API key usage in Sol Research to detect unauthorized access
4. **Limit Access**: Only share the connector URL with trusted parties

## Server Deployment

The Remote MCP server is deployed on Fly.io at:
- **URL**: https://sol-research-mcp.fly.dev
- **Health Check**: https://sol-research-mcp.fly.dev/health
- **Source**: `mcp-production/mcp-remote-server.js`

### Deployment

To deploy updates:

```bash
cd mcp-production
fly deploy
```

### Logs

View server logs:

```bash
fly logs --app sol-research-mcp
```

## API Reference

### Discovery Endpoint

**GET** `/.well-known/mcp`

**Response:**
```json
{
  "mcp_version": "2025-06-18",
  "transport": "http",
  "endpoints": { "http": "/", "info": "/mcp" },
  "server": {
    "name": "sol-research-remote-mcp",
    "title": "Sol Research MCP",
    "version": "1.0.0"
  },
  "capabilities": {
    "tools": { "list": true, "call": true },
    "resources": { "list": true, "read": true },
    "prompts": { "list": true, "get": true }
  },
  "auth": {
    "required": false,
    "type": "bearer",
    "description": "Organization or user API key required. Enter your API key in the configuration screen."
  }
}
```

### Tools List

**POST** `/` with:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

**Response:** Returns array of 10 tools (see "Available Tools" above)

### Tool Call

**POST** `/` with:
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "list_workspaces",
    "arguments": {}
  }
}
```

**URL**: Include `?api_key=sk-YOUR_KEY` in the URL

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [{
      "type": "text",
      "text": "{\n  \"workspaces\": [...]\n}"
    }]
  }
}
```

## Common Use Cases

### Search Research Data

Ask Claude: "Search for user feedback about checkout in Farm to Fork workspace"

Claude will use the `search` tool to find relevant documents.

### List Projects

Ask Claude: "Show me all projects in the Farm to Fork workspace"

Claude will use `list_projects` tool.

### Read Specific Document

Ask Claude: "Get document 123 from Farm to Fork workspace"

Claude will use `get_document` tool.

### Create New Document

Ask Claude: "Create a new document in Farm to Fork workspace, User Research project, titled 'User Interview - Sarah', with content about checkout flow feedback"

Claude will use `create_document` tool.

## Support

If you encounter issues:

1. **Check the troubleshooting section** above
2. **Review server logs**: `fly logs --app sol-research-mcp`
3. **Test API directly**: Use curl to test the Sol Research API directly
4. **Verify API key**: Make sure your API key is valid and has proper permissions

## Future Improvements

Potential enhancements:

- [ ] OAuth authentication (if Claude Web adds support)
- [ ] API key encryption at rest
- [ ] Rate limiting per API key
- [ ] Usage analytics dashboard
- [ ] Webhook support for real-time updates

## Related Documentation

- [API Integration Guide](./API_INTEGRATION.md) - General API documentation
- [MCP Deployment Guide](../MCP-DEPLOYMENT.md) - MCP server deployment details
- [Context for Developers](../CONTEXT-FOR-DEVELOPERS.md) - System architecture overview

