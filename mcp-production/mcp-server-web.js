#!/usr/bin/env node

import express from 'express';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// MCP server endpoint
app.post('/', async (req, res) => {
  try {
    const { method, id, params } = req.body;
    
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
            action: name,
            ...args,
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
            name: 'sol-research-mcp-web',
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

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`MCP Web Server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
});
