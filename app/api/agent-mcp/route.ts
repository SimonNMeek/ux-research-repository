import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { query, withRlsContext } from '@/db/postgres';
import { getSessionCookie, validateSession } from '@/lib/auth';

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

    const sessionId = await getSessionCookie();
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateSession(sessionId);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    return await withRlsContext({ userId: user.id }, async () => {
      const workspaceResult = await query(
        'SELECT id, slug, name, organization_id FROM workspaces WHERE slug = $1',
        [workspaceSlug]
      );
      const workspace = workspaceResult.rows[0];
      
      if (!workspace) {
        return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
      }

      const openaiApiKey = process.env.OPENAI_API_KEY;
      
      if (!openaiApiKey) {
        return NextResponse.json({ 
          error: 'OPENAI_API_KEY not configured in environment. This is used for tool orchestration.' 
        }, { status: 500 });
      }

      const mcpApiKey = process.env.MCP_API_KEY;
      
      if (!mcpApiKey) {
        return NextResponse.json({ error: 'MCP_API_KEY not configured' }, { status: 500 });
      }

      const mcpTools = await getMCPTools(req, mcpApiKey);
      
      const functions = mcpTools.map((tool: any) => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      }));

      const systemPrompt = `You are a helpful research assistant. The user is working in workspace: ${workspaceSlug}.

CRITICAL: Be SELECTIVE and ANALYTICAL. When the user asks for specific document types (e.g., "user interviews", "surveys", "checkout interviews"), you must:
1. FIRST determine what document types match the query
2. Use "search" tool with specific keywords to find matching documents, OR
3. If using "list_documents", you MUST filter and analyze the results to only include documents that actually match the user's intent
4. DO NOT include documents that don't match - be strict about relevance
5. Analyze document titles carefully - "pNPS", "CSAT scores", "Features" are NOT interviews, even if they're in the same project

TOOL SELECTION RULES:
- For SPECIFIC document types (interviews, surveys, specific topics): Use "search" tool with relevant keywords
- For listing ALL documents: Use "list_documents" - but then FILTER results based on user's question
- When filtering: Analyze document titles - "interview" in title suggests interview, "survey" suggests survey, metrics/reports (pNPS, CSAT) are NOT interviews
- **When user asks for analysis, takeaways, summaries, or detailed content: Use "get_document" to read full document content**
  - After finding documents via "search" or "list_documents", call "get_document" with document_id and workspace_slug
  - Use "get_document" to read full content when you need to analyze, summarize, or extract insights
- Always include workspace_slug: "${workspaceSlug}" when calling tools that require it

RESPONSE FORMAT:
- Group similar documents together
- Provide structured summaries with key details
- Be concise but informative
- If a document type doesn't match the query, exclude it even if it's in the project
- When providing analysis or takeaways, base it on full document content (use get_document)

Example: If user asks "What user interviews do I have in User Research":
1. Use "search" with query like "interview" and project_slug: "user-research" (or similar), OR
2. Use "list_documents" then filter to only include documents with "interview" in the title/type
3. DO NOT include surveys, pNPS, CSAT, or feature lists - only actual interviews

Example: If user asks "Give me the top 3 takeaways from user interviews":
1. First use "search" to find interview documents
2. Then use "get_document" with each document_id to read full content
3. Analyze the full content and synthesize the top 3 takeaways`;

      const openai = new OpenAI({ apiKey: openaiApiKey });
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
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
        max_tokens: 3000,
      });

      const messageResp = completion.choices[0].message;
      let finalResponse = '';
      
      const conversationMessages: any[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ];

      let currentMessage = messageResp;
      let maxIterations = 5;
      let iteration = 0;

      while (iteration < maxIterations) {
        if (currentMessage.tool_calls && currentMessage.tool_calls.length > 0) {
          conversationMessages.push(currentMessage);
          
          const toolMessages: any[] = [];
          
          for (const toolCall of currentMessage.tool_calls) {
            const toolName = toolCall.function.name;
            let args = {};
            try {
              args = JSON.parse(toolCall.function.arguments || '{}');
            } catch (e) {
              args = {};
            }
            
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
            
            const toolContent = typeof result === 'string' ? result : JSON.stringify(result);
            toolMessages.push({
              role: 'tool' as const,
              tool_call_id: toolCall.id,
              content: toolContent,
            });
          }
          
          conversationMessages.push(...toolMessages);
          
          const nextCompletion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: conversationMessages,
            tools: functions.map(f => ({
              type: 'function' as const,
              function: f
            })),
            temperature: 0.1,
            max_tokens: 3000,
          });
          
          currentMessage = nextCompletion.choices[0].message;
          iteration++;
          
          if (currentMessage.tool_calls && currentMessage.tool_calls.length > 0) {
            continue;
          }
          
          finalResponse = currentMessage.content || 'Unable to generate response.';
          break;
          
        } else {
          finalResponse = currentMessage.content || 'I need more information to help you.';
          break;
        }
      }
      
      if (!finalResponse) {
        finalResponse = 'Unable to process request. Please try rephrasing.';
      }

      return NextResponse.json({ response: finalResponse });
    });
  } catch (e: any) {
    console.error('Agent MCP error:', e);
    return NextResponse.json({ error: e?.message || 'Proxy error' }, { status: 500 });
  }
}
