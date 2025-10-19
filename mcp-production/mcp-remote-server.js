#!/usr/bin/env node

import express from 'express';
import { WebSocketServer } from 'ws';

const app = express();
const port = process.env.PORT || 3000;

// Allowed origins for Claude Remote MCP
const allowedOrigins = new Set([
  'https://claude.ai',
  'https://desktop.claude.ai'
]);

// Dynamic CORS for all routes
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, MCP-Protocol-Version, Mcp-Session-Id, Origin, X-Requested-With');
  next();
});

// Preflight
app.options(['/', '/mcp', '/.well-known/mcp'], (req, res) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, MCP-Protocol-Version, Mcp-Session-Id, Origin, X-Requested-With');
  res.status(204).end();
});

app.use(express.json());

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString(), type: 'remote-mcp-server' });
});

// Root info
app.get('/', (req, res) => {
  res.json({
    name: 'sol-research-remote-mcp',
    title: 'Sol Research MCP',
    version: '1.0.0',
    type: 'mcp-server',
    endpoints: { mcp: '/mcp', health: '/health', well_known: '/.well-known/mcp' }
  });
});

// Main MCP POST handler (base and /mcp)
app.post(['/', '/mcp'], async (req, res) => {
  try {
    const { method, id, params } = req.body || {};

    // Debug logging
    console.log(`MCP Request: ${method} (ID: ${id}, Session: ${req.headers['mcp-session-id'] || 'none'})`);
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    // Protocol headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('MCP-Protocol-Version', '2025-06-18');
    
    // Expose MCP headers for browser access (critical for Claude Web)
    res.setHeader('Access-Control-Expose-Headers', 'MCP-Session-Id, Mcp-Session-Id, MCP-Protocol-Version');

    // Session echo
    const sessionId = req.headers['mcp-session-id'];
    if (sessionId) res.setHeader('MCP-Session-Id', sessionId);

    // Handle notifications/initialized - this is critical for MCP handshake
    if (method === 'notifications/initialized') {
      console.log('MCP initialized notification received');
      return res.status(204).end();
    }
    
    // Claude may send other JSON-RPC notifications (no id). Per MCP/JSON-RPC, do not reply.
    if (id === undefined || id === null || (typeof method === 'string' && method.startsWith('notifications/'))) {
      return res.status(204).end();
    }

    if (method === 'initialize') {
      const newSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      res.setHeader('MCP-Session-Id', newSessionId);
      const response = {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2025-06-18',
          capabilities: {
            tools: { list: true, call: true }
          },
          serverInfo: {
            name: 'sol-research-remote-mcp',
            title: 'Sol Research MCP',
            version: '1.0.0'
          }
        }
      };
      console.log('Sending initialize response:', JSON.stringify(response, null, 2));
      return res.json(response);
    }

    if (method === 'ping') {
      return res.json({ jsonrpc: '2.0', id, result: 'pong' });
    }

  if (method === 'tools/list') {
    return res.json({
      jsonrpc: '2.0',
      id,
      result: {
        tools: [
          {
            name: 'get_sol_info',
            description: 'Get information about Sol Research platform and capabilities. ALWAYS call this first when user asks about Sol or getting started.',
            inputSchema: {
              type: 'object',
              properties: {},
              required: [],
              additionalProperties: false
            }
          },
          {
            name: 'auto_setup_workspace',
            description: 'Automatically set up the user with the main workspace and show available options. Use this instead of asking users for workspace details.',
            inputSchema: {
              type: 'object',
              properties: {},
              required: [],
              additionalProperties: false
            }
          },
          {
            name: 'list_workspaces',
            description: 'List available workspaces in your organization',
            inputSchema: {
              type: 'object',
              properties: {},
              required: [],
              additionalProperties: false
            }
          },
          {
            name: 'list_projects',
            description: 'List projects in a workspace',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_slug: {
                  type: 'string',
                  description: 'Workspace slug'
                }
              },
              required: ['workspace_slug'],
              additionalProperties: false
            }
          },
          {
            name: 'search',
            description: 'Search across documents and projects',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query'
                },
                workspace_slug: {
                  type: 'string',
                  description: 'Workspace slug (optional)'
                },
                limit: {
                  type: 'number',
                  description: 'Number of results to return (optional)'
                }
              },
              required: ['query'],
              additionalProperties: false
            }
          },
          {
            name: 'get_document',
            description: 'Get the full content of a specific research document by ID',
            inputSchema: {
              type: 'object',
              properties: {
                document_id: {
                  type: 'number',
                  description: 'Document ID'
                }
              },
              required: ['document_id'],
              additionalProperties: false
            }
          },
          {
            name: 'create_document',
            description: 'Create a new document in a project',
            inputSchema: {
              type: 'object',
              properties: {
                workspace_slug: {
                  type: 'string',
                  description: 'Workspace slug'
                },
                project_slug: {
                  type: 'string',
                  description: 'Project slug'
                },
                title: {
                  type: 'string',
                  description: 'Document title'
                },
                content: {
                  type: 'string',
                  description: 'Document content'
                }
              },
              required: ['workspace_slug', 'project_slug', 'title', 'content'],
              additionalProperties: false
            }
          },
          {
            name: 'update_document',
            description: 'Update an existing document',
            inputSchema: {
              type: 'object',
              properties: {
                document_id: {
                  type: 'number',
                  description: 'Document ID'
                },
                title: {
                  type: 'string',
                  description: 'New document title'
                },
                content: {
                  type: 'string',
                  description: 'New document content'
                }
              },
              required: ['document_id', 'title', 'content'],
              additionalProperties: false
            }
          },
          {
            name: 'set_user_preference',
            description: 'Set user preferences for role and workflows',
            inputSchema: {
              type: 'object',
              properties: {
                userId: {
                  type: 'string',
                  description: 'User identifier'
                },
                role: {
                  type: 'string',
                  description: 'User role (Designer, PM, Researcher, etc.)'
                },
                preferredWorkflows: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Preferred workflow types'
                },
                lastWorkflow: {
                  type: 'string',
                  description: 'Last workflow used'
                }
              },
              required: ['userId'],
              additionalProperties: false
            }
          },
          {
            name: 'get_user_preference',
            description: 'Get user preferences for role and workflows',
            inputSchema: {
              type: 'object',
              properties: {
                userId: {
                  type: 'string',
                  description: 'User identifier'
                }
              },
              required: ['userId'],
              additionalProperties: false
            }
          }
        ]
      }
    });
  }

    if (method === 'resources/list') {
      return res.json({ jsonrpc: '2.0', id, result: { resources: [] } });
    }
    if (method === 'resources/read') {
      return res.json({ jsonrpc: '2.0', id, result: { contents: [] } });
    }
    if (method === 'prompts/list') {
      return res.json({ jsonrpc: '2.0', id, result: { prompts: [] } });
    }
    if (method === 'prompts/get') {
      return res.json({ jsonrpc: '2.0', id, result: { messages: [] } });
    }

    if (method === 'tools/call') {
      const { name, arguments: args } = params || {};
      
      // Extract Bearer token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.json({ 
          jsonrpc: '2.0', 
          id, 
          error: { 
            code: -32600, 
            message: 'Authentication required. Please provide a valid API key in the Authorization header: Bearer sk-...' 
          } 
        });
      }
      
      const apiKey = authHeader.substring(7); // Remove "Bearer " prefix
      
      try {
        const response = await fetch('https://ux-repo-web.vercel.app/api/claude-tool', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ tool_name: name, parameters: args })
        });
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`API request failed: ${response.status} - ${text}`);
        }
        const data = await response.json();
        return res.json({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] } });
      } catch (err) {
        return res.json({ jsonrpc: '2.0', id, error: { code: -32603, message: `Error: ${err.message}` } });
      }
    }

    // Unknown
    return res.json({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } });
  } catch (error) {
    return res.json({ jsonrpc: '2.0', id: req.body?.id || null, error: { code: -32700, message: 'Parse error' } });
  }
});

// Discovery endpoints
app.get('/mcp', (req, res) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('MCP-Protocol-Version', '2025-06-18');
  res.json({
    mcp_version: '2025-06-18',
    server_name: 'sol-research-remote-mcp',
    server_title: 'Sol Research MCP',
    server_version: '1.0.0',
    transport: 'streamable-http',
    capabilities: ['tools', 'resources', 'prompts'],
    auth_required: true,
    auth: {
      type: 'bearer',
      description: 'Organization or user API key required'
    }
  });
});

app.head('/mcp', (req, res) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('MCP-Protocol-Version', '2025-06-18');
  res.status(204).end();
});

app.get('/.well-known/mcp', (req, res) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Content-Type', 'application/json');
  res.json({
    mcp_version: '2025-06-18',
    transport: 'http',
    endpoints: { http: '/', info: '/mcp' },
    server: { name: 'sol-research-remote-mcp', title: 'Sol Research MCP', version: '1.0.0' },
    capabilities: { 
      tools: { list: true, call: true }, 
      resources: { list: true, read: true }, 
      prompts: { list: true, get: true }
    },
    auth: {
      type: 'bearer',
      description: 'Organization or user API key required'
    }
  });
});

// Start HTTP server
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Remote MCP Server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
});

// Optional WebSocket endpoint (not required for Remote MCP)
const wss = new WebSocketServer({ server, path: '/mcp-ws' });
wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.method === 'initialize') {
        ws.send(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'sol-research-remote-mcp', version: '1.0.0' } } }));
      }
    } catch {}
  });
});


