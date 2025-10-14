#!/bin/bash

echo "🚀 Deploying MCP Server to Railway..."

cd mcp-production

echo "📦 Installing dependencies..."
npm install

echo "🔑 Logging into Railway..."
railway login

echo "🏗️ Creating new Railway project..."
railway new

echo "🚀 Deploying to Railway..."
railway up

echo "🌐 Getting deployment URL..."
railway domain

echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Copy the Railway URL from above"
echo "2. Update your Claude Desktop config with the URL"
echo "3. Restart Claude Desktop"
echo "4. Test with: 'List all workspaces in my Sol Research repository'"
