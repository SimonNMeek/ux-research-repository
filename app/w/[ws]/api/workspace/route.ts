import { NextRequest } from 'next/server';
import { withWorkspace, WorkspaceRouteHandler, workspaceResolver } from '../../../../../src/server/workspace-resolver';
import { WorkspaceRepo } from '../../../../../src/server/repo/workspace';

export const runtime = 'nodejs';

const workspaceRepo = new WorkspaceRepo();

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

  if (req.method === 'POST') {
    // Check permissions - only owner/admin can rename workspaces
    if (!workspaceResolver.canModifyWorkspace(context)) {
      return new Response(
        JSON.stringify({ error: 'You do not have permission to rename this workspace' }),
        { status: 403, headers: { 'content-type': 'application/json' } }
      );
    }

    try {
      const body = await req.json();
      const { name } = body;

      if (!name || typeof name !== 'string' || !name.trim()) {
        return new Response(
          JSON.stringify({ error: 'name is required' }),
          { status: 400, headers: { 'content-type': 'application/json' } }
        );
      }

      // Update the workspace name
      const updatedWorkspace = await workspaceRepo.update(context.workspace.id, { name: name.trim() });
      
      if (!updatedWorkspace) {
        return new Response(
          JSON.stringify({ error: 'Failed to update workspace' }),
          { status: 500, headers: { 'content-type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          id: updatedWorkspace.id,
          slug: updatedWorkspace.slug,
          name: updatedWorkspace.name,
          success: true
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    } catch (error: any) {
      console.error('Error renaming workspace:', error);
      return new Response(
        JSON.stringify({ error: error.message || 'Failed to rename workspace' }),
        { status: 500, headers: { 'content-type': 'application/json' } }
      );
    }
  }

  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    { status: 405, headers: { 'content-type': 'application/json' } }
  );
};

export async function GET(req: NextRequest, params: { params: { ws: string } | Promise<{ ws: string }> }) {
  return withWorkspace(handler, req, params);
}

export async function POST(req: NextRequest, params: { params: { ws: string } | Promise<{ ws: string }> }) {
  return withWorkspace(handler, req, params);
}
