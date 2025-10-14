#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { spawn } from 'child_process';
import path from 'path';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Store active MCP connections
const activeConnections = new Map();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    activeConnections: activeConnections.size 
  });
});

// WebSocket server for MCP connections (on same port as HTTP)
const wss = new WebSocketServer({ 
  noServer: true,
  perMessageDeflate: false 
});

wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection established');
  
  // Generate unique connection ID
  const connectionId = Math.random().toString(36).substr(2, 9);
  
  // Start MCP server process
  const mcpProcess = spawn('node', ['mcp-server-production.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: '/app'
  });
  
  // Store connection
  activeConnections.set(connectionId, {
    ws,
    mcpProcess,
    createdAt: new Date()
  });
  
  // Handle WebSocket messages (Claude → MCP)
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('WebSocket → MCP:', message);
      
      // Forward to MCP server
      mcpProcess.stdin.write(JSON.stringify(message) + '\n');
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error' }
      }));
    }
  });
  
  // Handle MCP server responses (MCP → Claude)
  mcpProcess.stdout.on('data', (data) => {
    try {
      const lines = data.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => {
        const response = JSON.parse(line);
        console.log('MCP → WebSocket:', response);
        ws.send(JSON.stringify(response));
      });
    } catch (error) {
      console.error('Error parsing MCP response:', error);
    }
  });
  
  // Handle MCP server errors
  mcpProcess.stderr.on('data', (data) => {
    console.error('MCP server error:', data.toString());
  });
  
  // Handle connection cleanup
  ws.on('close', () => {
    console.log('WebSocket connection closed');
    mcpProcess.kill();
    activeConnections.delete(connectionId);
  });
  
  mcpProcess.on('exit', (code) => {
    console.log(`MCP server process exited with code ${code}`);
    ws.close();
    activeConnections.delete(connectionId);
  });
  
  // Send connection established message
  ws.send(JSON.stringify({
    jsonrpc: '2.0',
    id: null,
    method: 'connection.established',
    params: { connectionId }
  }));
});

// HTTP endpoint for Claude Desktop to connect via curl
app.post('/mcp', async (req, res) => {
  try {
    const { method, id, params } = req.body;
    
    // For now, proxy to the existing web-based MCP server
    if (method === 'tools/list') {
      return res.json({
        jsonrpc: '2.0',
        id,
        result: {
          tools: [
            {
              name: 'list_workspaces',
              description: 'List all workspaces in Sol Research repository',
              inputSchema: {
                type: 'object',
                properties: {},
              },
            },
            {
              name: 'list_projects',
              description: 'List projects in a workspace',
              inputSchema: {
                type: 'object',
                properties: {
                  workspace_slug: {
                    type: 'string',
                    description: 'Workspace slug',
                  },
                },
                required: ['workspace_slug'],
              },
            },
            {
              name: 'list_documents',
              description: 'List documents in a project',
              inputSchema: {
                type: 'object',
                properties: {
                  workspace_slug: {
                    type: 'string',
                    description: 'Workspace slug',
                  },
                  project_slug: {
                    type: 'string',
                    description: 'Project slug',
                  },
                },
                required: ['workspace_slug', 'project_slug'],
              },
            },
            {
              name: 'search_documents',
              description: 'Search across documents',
              inputSchema: {
                type: 'object',
                properties: {
                  workspace_slug: {
                    type: 'string',
                    description: 'Workspace slug',
                  },
                  project_slug: {
                    type: 'string',
                    description: 'Project slug',
                  },
                  query: {
                    type: 'string',
                    description: 'Search query',
                  },
                },
                required: ['workspace_slug', 'project_slug', 'query'],
              },
            },
            {
              name: 'get_document',
              description: 'Get a specific document',
              inputSchema: {
                type: 'object',
                properties: {
                  workspace_slug: {
                    type: 'string',
                    description: 'Workspace slug',
                  },
                  project_slug: {
                    type: 'string',
                    description: 'Project slug',
                  },
                  document_id: {
                    type: 'integer',
                    description: 'Document ID',
                  },
                },
                required: ['workspace_slug', 'project_slug', 'document_id'],
              },
            },
          ],
        },
      });
    }

    if (method === 'tools/call') {
      const { name, arguments: args } = params;
      
      // Get API key from environment variable
      const apiKey = process.env.SOL_RESEARCH_API_KEY;
      if (!apiKey) {
        return res.json({
          jsonrpc: '2.0',
          id,
          error: {
            code: -32600,
            message: 'SOL_RESEARCH_API_KEY not configured',
          },
        });
      }

      try {
        const response = await fetch('https://ux-repo-web.vercel.app/api/claude-tool', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tool_name: name,
            parameters: args,
          }),
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        
        return res.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(data, null, 2),
              },
            ],
          },
        });
      } catch (error) {
        return res.json({
          jsonrpc: '2.0',
          id,
          error: {
            code: -32603,
            message: `Error: ${error.message}`,
          },
        });
      }
    }

    if (method === 'initialize') {
      return res.json({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2025-06-18',
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: 'sol-research-mcp-websocket',
            version: '1.0.0',
          },
        },
      });
    }

    // Unknown method
    return res.json({
      jsonrpc: '2.0',
      id,
      error: {
        code: -32601,
        message: 'Method not found',
      },
    });

  } catch (error) {
    return res.json({
      jsonrpc: '2.0',
      id: req.body.id || null,
      error: {
        code: -32700,
        message: 'Parse error',
      },
    });
  }
});

// Start the HTTP server with WebSocket upgrade support
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`MCP WebSocket Bridge running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
});

// Handle WebSocket upgrades
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});
