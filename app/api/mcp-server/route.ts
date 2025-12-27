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
            action: name,
            ...args,
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
