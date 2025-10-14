#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  {
    name: 'sol-research',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
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
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  // Get API key from environment variable
  const apiKey = process.env.SOL_RESEARCH_API_KEY;
  if (!apiKey) {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: SOL_RESEARCH_API_KEY environment variable not set',
        },
      ],
      isError: true,
    };
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
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
