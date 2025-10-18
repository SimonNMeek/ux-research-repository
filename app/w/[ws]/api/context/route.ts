import { NextRequest } from 'next/server';
import { withWorkspace, WorkspaceRouteHandler } from '../../../../../src/server/workspace-resolver';

export const runtime = 'nodejs';

const handler: WorkspaceRouteHandler = async (context, req) => {
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({
        context: {
          organization: context.organization,
          workspace: context.workspace,
          user: {
            id: context.user.id,
            email: context.user.email,
            name: context.user.name,
            system_role: context.user.system_role
          },
          organizationRole: context.organizationRole,
          workspaceRole: context.workspaceRole
        }
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
