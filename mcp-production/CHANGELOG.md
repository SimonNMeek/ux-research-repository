# Claude Remote MCP Connector Fixes - November 2025

## Changes Made

### Discovery Endpoint Improvements

1. **Fixed `/mcp` endpoint format:**
   - Changed transport from `streamable-http` to `http` for consistency
   - Changed capabilities from array format to object format for consistency
   - Added both `auth_required: true` (top-level) and `auth` object with `required: true`
   - Added `logging: {}` capability

2. **Enhanced `/.well-known/mcp` endpoint:**
   - Added `MCP-Protocol-Version` header
   - Added `required: true` to auth object
   - Added `logging: {}` to capabilities
   - Improved documentation comments

3. **Enhanced initialize response:**
   - Added all capabilities (resources, prompts, logging) to match discovery endpoints
   - Ensures consistency between discovery and protocol handshake

## Why These Changes Matter

Claude Remote MCP connector requires:
- Consistent format across all discovery endpoints
- Proper auth configuration that matches expected structure
- All capabilities declared in both discovery and initialize responses
- Proper MCP protocol headers

## Testing

After deployment, test:
1. Discovery endpoints: `/.well-known/mcp` and `/mcp`
2. Full protocol handshake: `initialize` → `notifications/initialized` → `tools/list`
3. Verify Claude Web Configure screen populates correctly

## Deployment

Deploy to Fly.io:
```bash
cd mcp-production
flyctl deploy
```

Then test the discovery endpoints:
```bash
curl https://sol-research-mcp.fly.dev/.well-known/mcp
curl https://sol-research-mcp.fly.dev/mcp
```

