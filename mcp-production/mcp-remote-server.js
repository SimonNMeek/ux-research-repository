#!/usr/bin/env node

import express from 'express';
import { WebSocketServer } from 'ws';

const app = express();
const port = process.env.PORT || 3000;

// Session storage for API keys (sessionId -> apiKey)
const sessionApiKeys = new Map();

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
    
    // Extract API key from URL query parameter (for Claude Web Remote MCP which doesn't have an auth field)
    // Try multiple ways to get it since Express query parsing can vary
    let apiKeyFromUrl = req.query.api_key || req.query.apiKey;
    
    // Also try parsing from the raw URL if query parsing didn't work
    if (!apiKeyFromUrl && req.url) {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      apiKeyFromUrl = url.searchParams.get('api_key') || url.searchParams.get('apiKey');
    }
    
    // Store on request object for use throughout this request
    if (apiKeyFromUrl) {
      req.apiKeyFromUrl = apiKeyFromUrl;
      const sessionId = req.headers['mcp-session-id'] || `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      sessionApiKeys.set(sessionId, apiKeyFromUrl);
      console.log(`API key found in URL query parameter (session: ${sessionId.substring(0, 8)}..., key: ${apiKeyFromUrl.substring(0, 12)}...)`);
    }

    // Debug logging
    console.log(`MCP Request: ${method} (ID: ${id}, Session: ${req.headers['mcp-session-id'] || 'none'})`);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    if (apiKeyFromUrl) {
      console.log('API key present in URL query parameter');
    }

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
      
      // Check for API key in initialize params or Authorization header
      const authHeader = req.headers.authorization || req.headers.Authorization || 
                         req.headers['authorization'] || req.headers['Authorization'];
      const apiKeyFromParams = params?.api_key || params?.apiKey || params?.authorization;
      
      let apiKey = null;
      if (authHeader && (authHeader.startsWith('Bearer ') || authHeader.startsWith('bearer '))) {
        apiKey = authHeader.substring(7);
        console.log(`Initialize: Found API key in Authorization header (session: ${newSessionId.substring(0, 8)}...)`);
      } else if (apiKeyFromParams) {
        apiKey = apiKeyFromParams;
        console.log(`Initialize: Found API key in params (session: ${newSessionId.substring(0, 8)}...)`);
      }
      
      // Store API key for this session
      if (apiKey) {
        sessionApiKeys.set(newSessionId, apiKey);
        console.log(`Initialize: Stored API key for session ${newSessionId.substring(0, 8)}...`);
      } else {
        console.log(`Initialize: No API key found in header or params (session: ${newSessionId.substring(0, 8)}...)`);
      }
      
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
    console.log(`tools/list called (ID: ${id})`);
    try {
      const response = {
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
                  description: 'Workspace slug'
                },
                limit: {
                  type: 'number',
                  description: 'Number of results to return (optional)'
                }
              },
              required: ['query', 'workspace_slug'],
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
                },
                workspace_slug: {
                  type: 'string',
                  description: 'Workspace slug'
                }
              },
              required: ['document_id', 'workspace_slug'],
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
    };
    console.log(`Sending tools/list response (ID: ${id})`, { toolsCount: response.result.tools.length });
    return res.json(response);
    } catch (error) {
      console.error('Error in tools/list handler:', error);
      return res.json({
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: `Error listing tools: ${error.message}`
        }
      });
    }
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
      
      // Log all headers for debugging
      console.log(`Tool call: ${name}`, { 
        args, 
        sessionId: req.headers['mcp-session-id'] || 'none',
        allHeaders: Object.keys(req.headers),
        authorizationHeader: req.headers.authorization || req.headers.Authorization || 'NOT FOUND',
        contentType: req.headers['content-type'] || req.headers['Content-Type']
      });
      
      // Get API key from header, URL query (stored on req), params, or session (in priority order)
      let apiKey;
      const currentSessionId = req.headers['mcp-session-id'] || sessionId;
      
      // Extract Bearer token from Authorization header (case-insensitive)
      const authHeader = req.headers.authorization || req.headers.Authorization || 
                         req.headers['authorization'] || req.headers['Authorization'];
      
      // Also check if API key is in params (some MCP clients pass it there)
      const apiKeyFromParams = args?.api_key || params?.api_key || req.body?.api_key;
      
      // Try multiple ways to get API key from URL query (check req.apiKeyFromUrl first - already extracted!)
      let apiKeyFromUrlQuery = req.apiKeyFromUrl || req.query.api_key || req.query.apiKey;
      if (!apiKeyFromUrlQuery && req.url) {
        try {
          const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
          apiKeyFromUrlQuery = url.searchParams.get('api_key') || url.searchParams.get('apiKey');
        } catch (e) {
          // URL parsing failed, continue without it
        }
      }
      
      console.log(`Tool call auth check:`, {
        hasAuthHeader: !!authHeader,
        hasUrlQuery: !!apiKeyFromUrlQuery,
        hasUrlQueryOnReq: !!req.apiKeyFromUrl,
        hasParams: !!apiKeyFromParams,
        hasSession: currentSessionId ? sessionApiKeys.has(currentSessionId) : false,
        sessionId: currentSessionId?.substring(0, 8) || 'none',
        queryParams: Object.keys(req.query),
        url: req.url?.substring(0, 100) || 'none',
        urlQueryValue: apiKeyFromUrlQuery ? `${apiKeyFromUrlQuery.substring(0, 12)}...` : 'none'
      });
      
      if (authHeader && (authHeader.startsWith('Bearer ') || authHeader.startsWith('bearer '))) {
        apiKey = authHeader.substring(7); // Remove "Bearer " or "bearer " prefix
        console.log(`Tool call: Using API key from Authorization header (session: ${currentSessionId?.substring(0, 8) || 'none'}...)`);
      } else if (apiKeyFromUrlQuery) {
        // URL query parameter is second priority (after header, before params)
        apiKey = apiKeyFromUrlQuery;
        // Store in session for future requests
        if (currentSessionId) {
          sessionApiKeys.set(currentSessionId, apiKey);
          console.log(`Tool call: Stored API key in session storage (session: ${currentSessionId.substring(0, 8)}...)`);
        }
        console.log(`Tool call: Using API key from URL query parameter (session: ${currentSessionId?.substring(0, 8) || 'none'}...)`);
      } else if (apiKeyFromParams) {
        apiKey = apiKeyFromParams;
        // Store in session for future requests
        if (currentSessionId) {
          sessionApiKeys.set(currentSessionId, apiKey);
        }
        console.log(`Tool call: Using API key from params (session: ${currentSessionId?.substring(0, 8) || 'none'}...)`);
      } else if (currentSessionId && sessionApiKeys.has(currentSessionId)) {
        apiKey = sessionApiKeys.get(currentSessionId);
        console.log(`Tool call: Using API key from session storage (session: ${currentSessionId.substring(0, 8)}...)`);
      } else {
        console.error('No API key found in header, URL query, params, or session', { 
          tool: name,
          sessionId: currentSessionId,
          hasSessionKey: currentSessionId ? sessionApiKeys.has(currentSessionId) : false,
          sessionKeysCount: sessionApiKeys.size,
          allHeaders: Object.keys(req.headers),
          queryParams: Object.keys(req.query),
          urlQueryValue: apiKeyFromUrlQuery || 'none'
        });
        return res.json({ 
          jsonrpc: '2.0', 
          id, 
          error: { 
            code: -32600, 
            message: 'Authentication required. Please provide a valid API key. It should be configured in Claude Web Remote MCP settings.' 
          } 
        });
      }
      
      const apiKeyPrefix = apiKey.substring(0, Math.min(12, apiKey.length)); // Log only prefix for security
      console.log(`Tool call authenticated: ${name} (API key: ${apiKeyPrefix}...)`);
      
      try {
        const upstreamUrl = 'https://ux-repo-web.vercel.app/api/claude-tool';
        console.log(`Calling upstream API: ${upstreamUrl}`, { tool: name });
        
        const response = await fetch(upstreamUrl, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ tool_name: name, parameters: args })
        });
        
        if (!response.ok) {
          const text = await response.text();
          console.error(`Upstream API error: ${response.status}`, { tool: name, error: text, status: response.status });
          throw new Error(`API request failed: ${response.status} - ${text.substring(0, 200)}`);
        }
        
        const data = await response.json();
        console.log(`Tool call succeeded: ${name}`, { responseSize: JSON.stringify(data).length });
        return res.json({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] } });
      } catch (err) {
        console.error(`Tool call error: ${name}`, { error: err.message, stack: err.stack });
        return res.json({ 
          jsonrpc: '2.0', 
          id, 
          error: { 
            code: -32603, 
            message: `Error calling tool '${name}': ${err.message}` 
          } 
        });
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
    auth_required: false,
    auth: {
      required: false,
      type: 'bearer',
      description: 'Organization or user API key required. Enter your API key in the configuration screen.'
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
      required: false,
      type: 'bearer',
      description: 'Organization or user API key required. Enter your API key in the configuration screen.'
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


