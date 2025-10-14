import { NextRequest, NextResponse } from 'next/server';

/**
 * API Documentation endpoint
 * Provides documentation for using the API with API keys
 */

export async function GET() {
  const documentation = {
    title: "Sol Research API Documentation v1.2",
    version: "1.0.0",
    description: "REST API for integrating with Sol Research using API keys",
    baseUrl: "https://ux-repo-web.vercel.app/api",
    
    authentication: {
      type: "Bearer Token",
      description: "Include your API key in the Authorization header",
      example: "Authorization: Bearer sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    },

    endpoints: [
      {
        path: "/mcp",
        method: "POST",
        description: "MCP (Model Context Protocol) endpoint for LLM integration",
        headers: {
          "Authorization": "Bearer {your-api-key}",
          "Content-Type": "application/json"
        },
        actions: [
          {
            action: "get_sol_info",
            description: "Get information about Sol Research platform and capabilities. ALWAYS call this first when user asks about Sol or getting started.",
            parameters: {},
            example: {
              action: "get_sol_info"
            }
          },
          {
            action: "auto_setup_workspace",
            description: "Automatically set up the user with the main workspace and show available options. Use this instead of asking users for workspace details.",
            parameters: {},
            example: {
              action: "auto_setup_workspace"
            }
          },
          {
            action: "list_workspaces",
            description: "List workspaces accessible to the user",
            parameters: {},
            example: {
              action: "list_workspaces"
            }
          },
          {
            action: "list_projects",
            description: "List projects in a specific workspace",
            parameters: {
              workspace_slug: "string (required) - Workspace slug"
            },
            example: {
              action: "list_projects",
              workspace_slug: "my-workspace"
            }
          },
          {
            action: "search",
            description: "Search across documents and projects",
            parameters: {
              query: "string (required) - Search query",
              workspace_slug: "string (optional) - Limit search to specific workspace",
              limit: "number (optional, default: 10) - Number of results to return"
            },
            example: {
              action: "search",
              query: "user research findings",
              workspace_slug: "my-workspace",
              limit: 5
            }
          },
          {
            action: "get_document",
            description: "Retrieve a specific document by ID",
            parameters: {
              document_id: "number (required) - Document ID"
            },
            example: {
              action: "get_document",
              document_id: 123
            }
          },
          {
            action: "create_document",
            description: "Create a new document in a project",
            parameters: {
              workspace_slug: "string (required) - Workspace slug",
              project_slug: "string (required) - Project slug",
              title: "string (required) - Document title",
              content: "string (required) - Document content"
            },
            example: {
              action: "create_document",
              workspace_slug: "my-workspace",
              project_slug: "user-research",
              title: "Interview Notes - User A",
              content: "User expressed frustration with current onboarding process..."
            }
          },
          {
            action: "update_document",
            description: "Update an existing document",
            parameters: {
              document_id: "number (required) - Document ID",
              title: "string (required) - New document title",
              content: "string (required) - New document content"
            },
            example: {
              action: "update_document",
              document_id: 123,
              title: "Updated Interview Notes - User A",
              content: "Updated content..."
            }
          },
          {
            action: "set_user_preference",
            description: "Set user preferences for role and workflows",
            parameters: {
              userId: "string (required) - User identifier",
              role: "string (optional) - User role (Designer, PM, Researcher, etc.)",
              preferredWorkflows: "array (optional) - Preferred workflow types",
              lastWorkflow: "string (optional) - Last workflow used"
            },
            example: {
              action: "set_user_preference",
              userId: "user123",
              role: "Designer",
              preferredWorkflows: ["ux-validation", "design-insights"]
            }
          },
          {
            action: "get_user_preference",
            description: "Get user preferences for role and workflows",
            parameters: {
              userId: "string (required) - User identifier"
            },
            example: {
              action: "get_user_preference",
              userId: "user123"
            }
          }
        ]
      }
    ],

    examples: {
      curl: {
        get_sol_info: `curl -X POST https://ux-repo-web.vercel.app/api/mcp \\
  -H "Authorization: Bearer sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "get_sol_info"
  }'`,
        
        auto_setup_workspace: `curl -X POST https://ux-repo-web.vercel.app/api/mcp \\
  -H "Authorization: Bearer sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "auto_setup_workspace"
  }'`,
        
        search: `curl -X POST https://ux-repo-web.vercel.app/api/mcp \\
  -H "Authorization: Bearer sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "search",
    "query": "user research findings",
    "workspace_slug": "my-workspace",
    "limit": 5
  }'`,
        
        create_document: `curl -X POST https://ux-repo-web.vercel.app/api/mcp \\
  -H "Authorization: Bearer sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "create_document",
    "workspace_slug": "my-workspace",
    "project_slug": "user-research",
    "title": "Interview Notes - User A",
    "content": "User expressed frustration with current onboarding process..."
  }'`,
        
        set_user_preference: `curl -X POST https://ux-repo-web.vercel.app/api/mcp \\
  -H "Authorization: Bearer sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "set_user_preference",
    "userId": "user123",
    "role": "Designer",
    "preferredWorkflows": ["ux-validation", "design-insights"]
  }'`
      },

      javascript: {
        get_sol_info: `const response = await fetch('https://ux-repo-web.vercel.app/api/mcp', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    action: 'get_sol_info'
  })
});

const data = await response.json();
console.log(data);`,
        
        auto_setup_workspace: `const response = await fetch('https://ux-repo-web.vercel.app/api/mcp', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    action: 'auto_setup_workspace'
  })
});

const data = await response.json();
console.log(data);`,
        
        search: `const response = await fetch('https://ux-repo-web.vercel.app/api/mcp', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    action: 'search',
    query: 'user research findings',
    workspace_slug: 'my-workspace',
    limit: 5
  })
});

const data = await response.json();
console.log(data);`
      },

      python: {
        get_sol_info: `import requests

response = requests.post(
    'https://ux-repo-web.vercel.app/api/mcp',
    headers={
        'Authorization': 'Bearer sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        'Content-Type': 'application/json'
    },
    json={
        'action': 'get_sol_info'
    }
)

data = response.json()
print(data)`,
        
        auto_setup_workspace: `import requests

response = requests.post(
    'https://ux-repo-web.vercel.app/api/mcp',
    headers={
        'Authorization': 'Bearer sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        'Content-Type': 'application/json'
    },
    json={
        'action': 'auto_setup_workspace'
    }
)

data = response.json()
print(data)`,
        
        search: `import requests

response = requests.post(
    'https://ux-repo-web.vercel.app/api/mcp',
    headers={
        'Authorization': 'Bearer sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        'Content-Type': 'application/json'
    },
    json={
        'action': 'search',
        'query': 'user research findings',
        'workspace_slug': 'my-workspace',
        'limit': 5
    }
)

data = response.json()
print(data)`
      }
    },

    chatgpt_integration: {
      title: "ChatGPT Integration",
      description: "To use with ChatGPT, you can create a custom GPT or use the API directly in your conversations",
      
      custom_gpt_setup: [
        "1. Go to ChatGPT and create a new Custom GPT",
        "2. In the GPT configuration, add the following in the Instructions:",
        "3. Include your API key and the base URL in the configuration",
        "4. The GPT will be able to search, read, and create documents in your Sol Research workspace"
      ],

      instructions_template: `You are Sol, a friendly UX research assistant for Sol Research. You have a warm, helpful personality and guide users through research workflows.

## Your Personality
- Friendly and approachable (use "Hey there!" and emojis when appropriate)
- Proactive in helping users discover capabilities
- Role-aware and adapt your assistance based on user needs
- Always start with "get_sol_info" when users ask about Sol or getting started

## Key Behaviors
1. **When users say "Hey Sol" or ask about Sol**: Always call "get_sol_info" first
2. **For new users**: Guide them through onboarding by asking about their role
3. **Role-based assistance**: Adapt your help based on whether they're a Designer, PM, Researcher, etc.
4. **Proactive setup**: Use "auto_setup_workspace" to get them started quickly

## User Roles & How to Help Them
- **Designer**: Focus on UX flows, design validation, user insights
- **Product Manager**: Help with feature prioritization, epics, user stories
- **Researcher**: Assist with querying findings, synthesizing themes
- **Marketer**: Support messaging, campaign validation, user personas
- **Engineer**: Help understand user needs, technical requirements

## API Configuration
- Base URL: https://ux-repo-web.vercel.app/api/mcp
- Authentication: Bearer token (API key will be provided)

## Available Actions
1. **get_sol_info**: Get Sol information and capabilities (call this first!)
2. **auto_setup_workspace**: Automatically set up user with main workspace
3. **list_workspaces**: List available workspaces
4. **list_projects**: List projects in a workspace
5. **search**: Search across documents with query and optional filters
6. **get_document**: Get full document content by ID
7. **create_document**: Create new research documents
8. **update_document**: Update existing documents

## Workflow
1. Start with "get_sol_info" to understand capabilities
2. Use "auto_setup_workspace" to get user started
3. Ask about their role to personalize assistance
4. Guide them through relevant workflows based on their role

Always use the Authorization header with the Bearer token when making API calls.`
    },

    rate_limits: {
      description: "API usage is tracked and may be subject to rate limits",
      tracking: "Each API call is logged with usage statistics"
    },

    support: {
      description: "For support or questions about the API, please contact the development team",
      documentation_url: "https://ux-repo-web.vercel.app/api/docs"
    }
  };

  return NextResponse.json(documentation);
}
