#!/usr/bin/env node

import { spawn } from 'child_process';

// Simple stdio proxy that forwards to our hosted MCP server
async function main() {
  // Start curl as a subprocess to make HTTP requests to our hosted MCP server
  const curl = spawn('curl', [
    '-X', 'POST',
    'https://sol-research-mcp.fly.dev/mcp',
    '-H', 'Content-Type: application/json',
    '-H', 'Accept: application/json',
    '-d', '@-'
  ], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Forward stdin to curl
  process.stdin.pipe(curl.stdin);

  // Forward curl stdout to process stdout
  curl.stdout.pipe(process.stdout);

  // Forward curl stderr to process stderr
  curl.stderr.pipe(process.stderr);

  // Handle process termination
  process.on('SIGINT', () => {
    curl.kill('SIGINT');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    curl.kill('SIGTERM');
    process.exit(0);
  });

  curl.on('exit', (code) => {
    process.exit(code);
  });
}

main().catch(console.error);
