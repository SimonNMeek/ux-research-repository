import { NextRequest, NextResponse } from 'next/server';

// Thin proxy to our MCP tools/call via Claude tool bridge.
// Expects body: { message: string, workspaceSlug: string }
// Env: MCP_API_KEY (org-scoped key)

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { message, workspaceSlug } = await req.json();
    if (!message || !workspaceSlug) {
      return NextResponse.json({ error: 'message and workspaceSlug are required' }, { status: 400 });
    }

    const apiKey = process.env.MCP_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'MCP_API_KEY not configured' }, { status: 500 });
    }

    // Ask MCP to search, then read and summarise (let MCP orchestrate tools)
    const prompt = `Workspace: ${workspaceSlug}\n\nUser request: ${message}`;

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
          name: 'search',
          arguments: { query: prompt, workspace_slug: workspaceSlug, limit: 50 },
        },
        jsonrpc: '2.0'
      }),
    });

    const data = await response.json().catch(() => ({} as any));
    if (!response.ok) {
      return NextResponse.json({ error: data?.error?.message || 'MCP request failed' }, { status: 502 });
    }

    // Return raw MCP content; UI already renders text + sources
    return NextResponse.json({ response: data?.result?.content?.[0]?.text || JSON.stringify(data) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Proxy error' }, { status: 500 });
  }
}


