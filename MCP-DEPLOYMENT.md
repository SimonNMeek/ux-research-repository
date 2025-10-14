# MCP Server Deployment Guide

## Overview

The MCP (Model Context Protocol) server needs to be deployed as a persistent service, not a serverless function, because it maintains a persistent connection with Claude Desktop.

## Deployment Options

### Option 1: Railway (Recommended)

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway:**
   ```bash
   railway login
   ```

3. **Create a new project:**
   ```bash
   railway new
   ```

4. **Set environment variables:**
   ```bash
   railway variables set SOL_RESEARCH_API_KEY=sk_your_api_key_here
   ```

5. **Deploy:**
   ```bash
   railway up
   ```

6. **Get the deployment URL:**
   ```bash
   railway domain
   ```

### Option 2: Fly.io

1. **Install Fly CLI:**
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Create fly.toml:**
   ```toml
   app = "sol-research-mcp"
   primary_region = "lax"

   [build]

   [env]
     SOL_RESEARCH_API_KEY = "sk_your_api_key_here"

   [[services]]
     internal_port = 3000
     protocol = "tcp"

     [[services.ports]]
       port = 80
       handlers = ["http"]
       force_https = true

     [[services.ports]]
       port = 443
       handlers = ["tls", "http"]
   ```

3. **Deploy:**
   ```bash
   fly deploy
   ```

### Option 3: DigitalOcean App Platform

1. **Create app.yaml:**
   ```yaml
   name: sol-research-mcp
   services:
   - name: mcp-server
     source_dir: /
     github:
       repo: your-username/your-repo
       branch: main
     run_command: node mcp-server-standalone.js
     environment_slug: node-js
     instance_count: 1
     instance_size_slug: basic-xxs
     envs:
     - key: SOL_RESEARCH_API_KEY
       value: sk_your_api_key_here
   ```

2. **Deploy via DigitalOcean dashboard**

## Claude Desktop Configuration

Once deployed, update your Claude Desktop config:

```json
{
	"mcpServers": {
		"ux-repo": {
			"command": "curl",
			"args": [
				"-X", "POST",
				"https://your-deployed-url.railway.app/api/mcp",
				"-H", "Authorization: Bearer sk_your_api_key_here",
				"-H", "Content-Type: application/json",
				"-d", "@-"
			],
			"env": {}
		}
	},
	"scale": 0,
	"locale": "en-US",
	"userThemeMode": "system",
	"dxt:allowlistEnabled": false,
	"dxt:allowlistLastUpdated": "2025-10-13T16:17:59.572Z"
}
```

## Testing

1. **Test the deployed MCP server:**
   ```bash
   curl -X POST https://your-deployed-url.railway.app/api/mcp \
     -H "Authorization: Bearer sk_your_api_key" \
     -H "Content-Type: application/json" \
     -d '{"method": "tools/list", "id": 1}'
   ```

2. **Test Claude Desktop integration:**
   - Restart Claude Desktop
   - Ask: "List all workspaces in my Sol Research repository"

## Troubleshooting

- **Connection issues:** Check that the MCP server is running and accessible
- **Authentication errors:** Verify the API key is correct
- **Timeout errors:** Ensure the MCP server is responding quickly
- **Tool not found:** Check that the MCP server is returning the correct tool definitions

## Environment Variables

- `SOL_RESEARCH_API_KEY`: Your Sol Research API key (starts with `sk-`)

## Files to Deploy

- `mcp-server-standalone.js` - Main MCP server
- `package-mcp.json` - Dependencies (rename to `package.json`)
- `Dockerfile.mcp` - Docker configuration (if using Docker)
