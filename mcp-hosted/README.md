# Sol Research MCP Server

Hosted MCP server for Claude Desktop integration with Sol Research repository.

## Deployment to Railway

1. Install Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```

2. Login to Railway:
   ```bash
   railway login
   ```

3. Create new project:
   ```bash
   railway new
   ```

4. Deploy:
   ```bash
   railway up
   ```

5. Get the URL:
   ```bash
   railway domain
   ```

## Claude Desktop Configuration

Once deployed, update your Claude Desktop config to use the hosted MCP server:

```json
{
	"mcpServers": {
		"ux-repo": {
			"command": "curl",
			"args": [
				"-X", "POST",
				"https://your-railway-url.railway.app",
				"-H", "Authorization: Bearer sk_your_api_key_here",
				"-H", "Content-Type: application/json",
				"-d", "@-"
			],
			"env": {}
		}
	}
}
```

## Testing

Test the hosted MCP server:

```bash
curl -X POST https://your-railway-url.railway.app \
  -H "Authorization: Bearer sk_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/list", "id": 1}'
```
