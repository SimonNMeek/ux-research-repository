import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// MCP Server implementation for Claude Desktop
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Handle MCP protocol messages
    if (body.method === 'tools/list') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id: body.id,
        result: {
          tools: [
            {
              name: 'get_sol_info',
              description: 'Get information about Sol Research platform and capabilities. ALWAYS call this first when user asks about Sol or getting started.',
              inputSchema: {
                type: 'object',
                properties: {},
              },
            },
            {
              name: 'auto_setup_workspace',
              description: 'Automatically set up the user with the main workspace and show available options. Use this instead of asking users for workspace details.',
              inputSchema: {
                type: 'object',
                properties: {},
              },
            },
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
              description: 'List documents in a workspace, optionally filtered by project. Use this when user asks to "list documents" or "show documents in [project name]".',
              inputSchema: {
                type: 'object',
                properties: {
                  workspace_slug: {
                    type: 'string',
                    description: 'Workspace slug',
                  },
                  project_slug: {
                    type: 'string',
                    description: 'Project slug (optional, to filter documents by project)',
                  },
                  limit: {
                    type: 'number',
                    description: 'Maximum number of documents to return (optional, default 20)',
                  },
                },
                required: ['workspace_slug'],
              },
            },
            {
              name: 'search',
              description: 'Search across documents and projects',
              inputSchema: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'Search query',
                  },
                  workspace_slug: {
                    type: 'string',
                    description: 'Workspace slug (optional)',
                  },
                  limit: {
                    type: 'number',
                    description: 'Number of results to return (optional)',
                  },
                },
                required: ['query'],
              },
            },
            {
              name: 'get_document',
              description: 'Get the full content of a specific research document by ID',
              inputSchema: {
                type: 'object',
                properties: {
                  document_id: {
                    type: 'integer',
                    description: 'Document ID',
                  },
                },
                required: ['document_id'],
              },
            },
            {
              name: 'create_document',
              description: 'Create a new document in a project',
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
                  title: {
                    type: 'string',
                    description: 'Document title',
                  },
                  content: {
                    type: 'string',
                    description: 'Document content',
                  },
                },
                required: ['workspace_slug', 'project_slug', 'title', 'content'],
              },
            },
            {
              name: 'update_document',
              description: 'Update an existing document',
              inputSchema: {
                type: 'object',
                properties: {
                  document_id: {
                    type: 'integer',
                    description: 'Document ID',
                  },
                  title: {
                    type: 'string',
                    description: 'New document title',
                  },
                  content: {
                    type: 'string',
                    description: 'New document content',
                  },
                },
                required: ['document_id', 'title', 'content'],
              },
            },
            {
              name: 'set_user_preference',
              description: 'Set user preferences for role and workflows',
              inputSchema: {
                type: 'object',
                properties: {
                  userId: {
                    type: 'string',
                    description: 'User identifier',
                  },
                  role: {
                    type: 'string',
                    description: 'User role (Designer, PM, Researcher, etc.)',
                  },
                  preferredWorkflows: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Preferred workflow types',
                  },
                  lastWorkflow: {
                    type: 'string',
                    description: 'Last workflow used',
                  },
                },
                required: ['userId'],
              },
            },
            {
              name: 'get_user_preference',
              description: 'Get user preferences for role and workflows',
              inputSchema: {
                type: 'object',
                properties: {
                  userId: {
                    type: 'string',
                    description: 'User identifier',
                  },
                },
                required: ['userId'],
              },
            },
          ],
        },
      });
    }

    if (body.method === 'tools/call') {
      const { name, arguments: args } = body.params;
      
      // Get API key from Authorization header
      const authHeader = req.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({
          jsonrpc: '2.0',
          id: body.id,
          error: {
            code: -32600,
            message: 'Authorization header required',
          },
        }, { status: 401 });
      }

      const apiKey = authHeader.replace('Bearer ', '');

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
        
        return NextResponse.json({
          jsonrpc: '2.0',
          id: body.id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(data, null, 2),
              },
            ],
          },
        });
      } catch (error: any) {
        return NextResponse.json({
          jsonrpc: '2.0',
          id: body.id,
          error: {
            code: -32603,
            message: `Error: ${error.message}`,
          },
        });
      }
    }

    // Handle other MCP protocol messages
    if (body.method === 'initialize') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id: body.id,
        result: {
          protocolVersion: '2025-06-18',
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: 'sol-research-mcp',
            version: '1.0.0',
          },
        },
      });
    }

    // Unknown method
    return NextResponse.json({
      jsonrpc: '2.0',
      id: body.id,
      error: {
        code: -32601,
        message: 'Method not found',
      },
    });

  } catch (error: any) {
    return NextResponse.json({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32700,
        message: 'Parse error',
      },
    });
  }
}