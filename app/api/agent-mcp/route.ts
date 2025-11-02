import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getDbAdapter, getDbType } from '@/db/adapter';

// Smart proxy that uses OpenAI to orchestrate MCP tools
// Expects body: { message: string, workspaceSlug: string }
// Uses platform-wide OPENAI_API_KEY for orchestration (deciding which tools to call)
// Uses org-scoped MCP_API_KEY for authenticating MCP tool calls

export const runtime = 'nodejs';

// Fetch available MCP tools
async function getMCPTools(req: NextRequest, apiKey: string) {
  const response = await fetch(`${req.nextUrl.origin}/api/mcp`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      method: 'tools/list',
      id: Date.now(),
      jsonrpc: '2.0'
    }),
  });
  
  const data = await response.json();
  return data?.result?.tools || [];
}

// Call an MCP tool
async function callMCPTool(req: NextRequest, apiKey: string, toolName: string, args: any) {
  const response = await fetch(`${req.nextUrl.origin}/api/mcp`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      method: 'tools/call',
      id: Date.now(),
      params: {
        name: toolName,
        arguments: args,
      },
      jsonrpc: '2.0'
    }),
  });
  
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || 'MCP tool call failed');
  }
  
  // Parse the result content
  const resultText = data.result?.content?.[0]?.text;
  if (!resultText) {
    throw new Error('MCP tool returned no content');
  }
  
  try {
    return JSON.parse(resultText);
  } catch (parseError) {
    // If it's not JSON, return as string
    return { text: resultText };
  }
}

export async function POST(req: NextRequest) {
  try {
    const { message, workspaceSlug } = await req.json();
    if (!message || !workspaceSlug) {
      return NextResponse.json({ error: 'message and workspaceSlug are required' }, { status: 400 });
    }

    // Get workspace and organization
    const adapter = getDbAdapter();
    const dbType = getDbType();
    
    let workspace: any;
    if (dbType === 'postgres') {
      const result = await adapter.query(
        'SELECT id, slug, name, organization_id FROM workspaces WHERE slug = $1',
        [workspaceSlug]
      );
      workspace = result.rows[0];
    } else {
      const db = adapter as any;
      workspace = db.prepare('SELECT id, slug, name, organization_id FROM workspaces WHERE slug = ?').get(workspaceSlug);
    }
    
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Use platform-wide OpenAI key for orchestration (deciding which MCP tools to call)
    // This is separate from org-scoped MCP_API_KEY which authenticates tool calls
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      return NextResponse.json({ 
        error: 'OPENAI_API_KEY not configured in environment. This is used for tool orchestration.' 
      }, { status: 500 });
    }

    // MCP_API_KEY should come from the request (org's API key from frontend)
    // For now, fall back to env if not passed in request
    // TODO: Frontend should pass org's MCP API key
    const mcpApiKey = process.env.MCP_API_KEY;
    
    if (!mcpApiKey) {
      return NextResponse.json({ error: 'MCP_API_KEY not configured' }, { status: 500 });
    }

    // Get available MCP tools
    const mcpTools = await getMCPTools(req, mcpApiKey);
    
    // Convert MCP tools to OpenAI function format
    const functions = mcpTools.map((tool: any) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    }));

    // Add workspace context to the message
    const systemPrompt = `You are a helpful research assistant. The user is working in workspace: ${workspaceSlug}.

IMPORTANT TOOL SELECTION RULES:
- To LIST DOCUMENTS in a project: Use "list_documents" tool with project_slug parameter (first call "list_projects" to get the project slug if you only have the project name)
- To SEARCH for specific content: Use "search" tool
- When user asks "list documents in [Project Name]": 
  1. If you know the project slug, use "list_documents" with project_slug
  2. If you only have the project name, first call "list_projects" to find the slug, then call "list_documents" with that slug
- Always include workspace_slug: "${workspaceSlug}" when calling tools that require it

Example: If user says "list documents in SupaDupa User Research":
1. Call "list_projects" to find project slug "supadupa-user-research"
2. Call "list_documents" with project_slug: "supadupa-user-research"`;

    const openai = new OpenAI({ apiKey: openaiApiKey });
    
    // Use OpenAI to decide which tools to call
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      tools: functions.map(f => ({
        type: 'function' as const,
        function: f
      })),
      tool_choice: 'auto',
      temperature: 0.1,
      max_tokens: 2000,
    });

    const messageResp = completion.choices[0].message;
    let finalResponse = '';
    
    // Build conversation history for sequential tool calls
    const conversationMessages: any[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ];

    // Handle sequential tool calls - loop until we get a final text response
    let currentMessage = messageResp;
    let maxIterations = 5; // Prevent infinite loops
    let iteration = 0;

    while (iteration < maxIterations) {
      if (currentMessage.tool_calls && currentMessage.tool_calls.length > 0) {
        // Add the assistant's tool call request to conversation
        conversationMessages.push(currentMessage);
        
        const toolMessages: any[] = [];
        
        // Execute all tool calls
        for (const toolCall of currentMessage.tool_calls) {
          const toolName = toolCall.function.name;
          let args = {};
          try {
            args = JSON.parse(toolCall.function.arguments || '{}');
          } catch (e) {
            args = {};
          }
          
          // Always inject workspace_slug if tool supports it
          if (functions.find(f => f.name === toolName)?.parameters?.properties?.workspace_slug) {
            args = { ...args, workspace_slug: workspaceSlug };
          }

          let result;
          try {
            result = await callMCPTool(req, mcpApiKey, toolName, args);
            console.log(`Tool ${toolName} succeeded`);
          } catch (toolError: any) {
            console.error(`Tool ${toolName} failed:`, toolError);
            result = { error: toolError.message || 'Tool call failed' };
          }
          
          // Add tool result to messages
          const toolContent = typeof result === 'string' ? result : JSON.stringify(result);
          toolMessages.push({
            role: 'tool' as const,
            tool_call_id: toolCall.id,
            content: toolContent,
          });
        }
        
        // Add tool results to conversation
        conversationMessages.push(...toolMessages);
        
        // Get OpenAI's next move (might be another tool call or final response)
        const nextCompletion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: conversationMessages,
          tools: functions.map(f => ({
            type: 'function' as const,
            function: f
          })),
          temperature: 0.1,
          max_tokens: 2000,
        });
        
        currentMessage = nextCompletion.choices[0].message;
        iteration++;
        
        // If OpenAI wants to call more tools, continue the loop
        if (currentMessage.tool_calls && currentMessage.tool_calls.length > 0) {
          continue;
        }
        
        // Otherwise, we have a final response
        finalResponse = currentMessage.content || 'Unable to generate response.';
        break;
        
      } else {
        // No tool calls, this is the final response
        finalResponse = currentMessage.content || 'I need more information to help you.';
        break;
      }
    }
    
    // Fallback if we hit max iterations or something went wrong
    if (!finalResponse) {
      finalResponse = 'Unable to process request. Please try rephrasing.';
    }

    return NextResponse.json({ response: finalResponse });
  } catch (e: any) {
    console.error('Agent MCP error:', e);
    return NextResponse.json({ error: e?.message || 'Proxy error' }, { status: 500 });
  }
}
