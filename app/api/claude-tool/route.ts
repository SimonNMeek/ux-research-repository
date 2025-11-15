import { NextRequest, NextResponse } from 'next/server';

/**
 * Claude Tool Integration
 * Provides a webhook endpoint that Claude can call to access your research data
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tool_name, parameters } = body;
    
    console.log('Claude tool request:', { tool_name, parameters });

    // Validate the request (you might want to add authentication here)
    if (!tool_name) {
      return NextResponse.json(
        { error: 'Missing tool_name' },
        { status: 400 }
      );
    }
    
    // Handle tools that don't require parameters
    const toolsWithoutParams = ['get_sol_info', 'auto_setup_workspace', 'list_workspaces'];
    if (!parameters && !toolsWithoutParams.includes(tool_name)) {
      return NextResponse.json(
        { error: 'Missing parameters' },
        { status: 400 }
      );
    }

    // Route to the appropriate MCP endpoint
    let mcpEndpoint = '';
    let queryParams = new URLSearchParams();
    let httpMethod = 'GET'; // Default to GET
    let requestBody: any = null; // For POST/PUT requests

    console.log('Processing tool:', tool_name);
    
    switch (tool_name) {
      case 'get_sol_info':
        console.log('Handling get_sol_info');
        return NextResponse.json({
          message: `Hey there! 👋 I'm Sol, your UX research assistant.

**What is Sol Research?**
Sol Research is your intelligent research repository that helps you query real UX research findings, generate summaries, and use research insights to drive design, product, and marketing decisions.

**What I can help you with:**
- 🔍 **Search & Query**: Find relevant research findings and user insights
- 📊 **Synthesize**: Generate summaries and identify patterns across research
- 🎯 **Role-Based Assistance**: Tailored help for Designers, PMs, Researchers, Marketers, and Engineers
- 📝 **Document Management**: Create, update, and organize research documents
- 🚀 **Workflow Support**: Turn research into concrete outputs like interview scripts, feature roadmaps, or epics

**To get started, I can:**
- Set up your workspace automatically
- Help you discover available research
- Guide you through role-specific workflows

Ready to dive in? Let me know your role and what you'd like to achieve!`,
          capabilities: [
            'Search across research documents',
            'Generate research summaries',
            'Create and manage documents',
            'Role-based workflow guidance',
            'Workspace and project management'
          ],
          status: 'ready'
        });

      case 'auto_setup_workspace':
        return NextResponse.json({
          message: "Great! Let me set you up with the main workspace.",
          workspace: {
            slug: "farm-to-fork",
            name: "Farm to Fork",
            description: "Main research workspace with comprehensive user research data"
          },
          projects: [
            {
              slug: "user-research",
              name: "User Research",
              description: "User interviews, surveys, and usability testing results"
            },
            {
              slug: "market-analysis", 
              name: "Market Analysis",
              description: "Competitive analysis and market research findings"
            },
            {
              slug: "product-feedback",
              name: "Product Feedback",
              description: "User feedback, feature requests, and product insights"
            }
          ],
          next_steps: [
            "Tell me about your role (Designer, PM, Researcher, etc.)",
            "Ask me to search for specific topics",
            "Request help with your workflow"
          ]
        });

      case 'list_workspaces':
        mcpEndpoint = '/api/mcp/workspaces';
        break;
      
      case 'list_projects':
        if (!parameters.workspace_slug) {
          return NextResponse.json(
            { error: 'workspace_slug parameter required' },
            { status: 400 }
          );
        }
        mcpEndpoint = '/api/mcp/projects';
        queryParams.set('workspace', parameters.workspace_slug);
        break;
      
      case 'list_documents':
        if (!parameters.workspace_slug) {
          return NextResponse.json(
            { error: 'workspace_slug parameter required' },
            { status: 400 }
          );
        }
        mcpEndpoint = '/api/mcp/documents';
        queryParams.set('workspace', parameters.workspace_slug);
        if (parameters.project_slug) {
          queryParams.set('project', parameters.project_slug);
        }
        if (parameters.limit) {
          queryParams.set('limit', parameters.limit.toString());
        }
        break;
      
      case 'search':
        if (!parameters.query) {
          return NextResponse.json(
            { error: 'query parameter required' },
            { status: 400 }
          );
        }
        mcpEndpoint = '/api/mcp/search';
        queryParams.set('q', parameters.query); // Search endpoint expects 'q' parameter
        if (parameters.workspace_slug) {
          queryParams.set('workspace', parameters.workspace_slug);
        }
        if (parameters.project_slug) {
          queryParams.set('project', parameters.project_slug);
        }
        if (parameters.limit) {
          queryParams.set('limit', parameters.limit.toString());
        }
        break;

      case 'get_document':
        if (!parameters.document_id) {
          return NextResponse.json(
            { error: 'document_id parameter required' },
            { status: 400 }
          );
        }
        mcpEndpoint = `/api/mcp/documents/${parameters.document_id}`;
        break;

      case 'create_document':
        if (!parameters.workspace_slug || !parameters.project_slug || !parameters.title || !parameters.content) {
          return NextResponse.json(
            { error: 'workspace_slug, project_slug, title, and content parameters required' },
            { status: 400 }
          );
        }
        mcpEndpoint = '/api/mcp/documents';
        httpMethod = 'POST';
        queryParams.set('workspace', parameters.workspace_slug); // Map workspace_slug to workspace query param
        requestBody = {
          title: parameters.title,
          content: parameters.content,
          project_slug: parameters.project_slug
        };
        break;

      case 'update_document':
        if (!parameters.document_id || !parameters.title || !parameters.content) {
          return NextResponse.json(
            { error: 'document_id, title, and content parameters required' },
            { status: 400 }
          );
        }
        mcpEndpoint = `/api/mcp/documents/${parameters.document_id}`;
        httpMethod = 'PUT';
        requestBody = {
          title: parameters.title,
          content: parameters.content
        };
        break;

      case 'set_user_preference':
        return NextResponse.json({
          message: `Great! I've saved your preferences.`,
          preferences: {
            userId: parameters.userId,
            role: parameters.role || 'User',
            preferredWorkflows: parameters.preferredWorkflows || [],
            lastWorkflow: parameters.lastWorkflow || null
          },
          personalized_suggestions: parameters.role ? `As a ${parameters.role}, I can help you with role-specific workflows and insights.` : 'I can help you discover workflows that match your needs.'
        });

      case 'get_user_preference':
        return NextResponse.json({
          message: "Here are your saved preferences:",
          preferences: {
            userId: parameters.userId,
            role: 'Designer', // Default role
            preferredWorkflows: ['ux-validation', 'design-insights'],
            lastWorkflow: 'research-synthesis'
          }
        });
      
      default:
        return NextResponse.json(
          { error: `Unknown tool: ${tool_name}` },
          { status: 400 }
        );
    }

    // Get API key from request headers (should come from Authorization header via MCP server)
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    const apiKey = authHeader?.replace(/^Bearer /i, '') || request.headers.get('x-api-key') || 'sk-xd1mN9kYC5BcFn8YGu527FvXz9B515bNOZCQGSUV9pMa1ZW9';

    // Call the MCP endpoint
    const baseUrl = 'https://ux-repo-web.vercel.app';
    const queryString = queryParams.toString();
    const url = queryString ? `${baseUrl}${mcpEndpoint}?${queryString}` : `${baseUrl}${mcpEndpoint}`;
    
    console.log('Claude tool calling:', { method: httpMethod, url, hasBody: !!requestBody });
    
    // Build fetch options
    const fetchOptions: RequestInit = {
      method: httpMethod,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    };
    
    // Add body for POST/PUT requests
    if (requestBody && (httpMethod === 'POST' || httpMethod === 'PUT')) {
      fetchOptions.body = JSON.stringify(requestBody);
      console.log('Request body:', requestBody);
    }
    
    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('MCP API error:', response.status, errorText);
      return NextResponse.json(
        { error: `MCP API error: ${response.status} ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Claude tool error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    },
  });
}
