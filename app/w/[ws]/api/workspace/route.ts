import { NextRequest } from 'next/server';
import { withWorkspace, WorkspaceRouteHandler } from '../../../../../src/server/workspace-resolver';

export const runtime = 'nodejs';

const handler: WorkspaceRouteHandler = async (context, req) => {
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({
        id: context.workspace.id,
        slug: context.workspace.slug,
        name: context.workspace.name
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' }
      }
    );
  }

  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    { status: 405, headers: { 'content-type': 'application/json' } }
  );
};

export async function GET(req: NextRequest, params: { params: { ws: string } | Promise<{ ws: string }> }) {
  return withWorkspace(handler, req, params);
}
