#!/bin/bash

echo "🚀 Deploying MCP Server to Fly.io..."

cd mcp-production

echo "📦 Installing Fly CLI..."
curl -L https://fly.io/install.sh | sh

echo "🔑 Logging into Fly.io..."
fly auth login

echo "🏗️ Creating new Fly app..."
fly launch --no-deploy

echo "🚀 Deploying to Fly.io..."
fly deploy

echo "🌐 Getting deployment URL..."
fly info

echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Copy the Fly.io URL from above"
echo "2. Update your Claude Desktop config with the URL"
echo "3. Restart Claude Desktop"
echo "4. Test with: 'List all workspaces in my Sol Research repository'"
