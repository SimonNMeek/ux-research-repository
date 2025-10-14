import { NextRequest, NextResponse } from 'next/server';
import { withMcpAuth, McpContext } from '@/lib/mcp-middleware';

const handler = async (context: McpContext, request: NextRequest) => {
  return NextResponse.json({
    message: 'MCP API is working!',
    user: {
      id: context.user.id,
      email: context.user.email,
      name: context.user.name
    },
    workspace: context.workspace ? {
      id: context.workspace.id,
      slug: context.workspace.slug,
      name: context.workspace.name
    } : null,
    timestamp: new Date().toISOString()
  });
};

export const GET = withMcpAuth(handler);
