#!/usr/bin/env bash
set -euo pipefail

# Ensure Node 20 is used so native modules like better-sqlite3 match ABI
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck source=/dev/null
  . "$HOME/.nvm/nvm.sh"
  nvm use 20 >/dev/null || true
fi

cd "$(dirname "$0")/.."
exec ./node_modules/.bin/tsx mcp/server.ts



