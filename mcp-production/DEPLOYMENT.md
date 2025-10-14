# Deploy MCP Server to Railway

## Step 1: Create Railway Account
1. Go to https://railway.app
2. Sign up with GitHub
3. Install Railway CLI: `npm install -g @railway/cli`

## Step 2: Deploy from Terminal
```bash
cd mcp-production
railway login
railway new
railway up
```

## Step 3: Get Deployment URL
```bash
railway domain
```

## Step 4: Configure Claude Desktop

Once deployed, you'll get a URL like: `https://sol-research-mcp-production-production.railway.app`

Update your Claude Desktop config:

```json
{
	"mcpServers": {
		"ux-repo": {
			"command": "curl",
			"args": [
				"-X", "POST",
				"https://your-railway-url.railway.app",
				"-H", "Authorization: Bearer sk-qb85RiisZTwwgMjNM14eyFM7wHQN0CbGLFjlLOvwAjrTQ4sq",
				"-H", "Content-Type: application/json",
				"-d", "@-"
			],
			"env": {}
		}
	}
}
```

## Alternative: Deploy via Railway Dashboard

1. Go to https://railway.app/dashboard
2. Click "New Project"
3. Choose "Deploy from GitHub repo"
4. Select your repo and the `mcp-production` folder
5. Railway will automatically deploy

## Testing

Test the deployed MCP server:
```bash
curl -X POST https://your-railway-url.railway.app \
  -H "Authorization: Bearer sk_qb85RiisZTwwgMjNM14eyFM7wHQN0CbGLFjlLOvwAjrTQ4sq" \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/list", "id": 1}'
```

## Troubleshooting

- **Connection issues**: Check Railway logs in dashboard
- **Authentication errors**: Verify API key is correct
- **Deployment fails**: Check package.json and dependencies
