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

      console.log('Workspace rename request:', { workspaceId: context.workspace.id, workspaceSlug: context.workspace.slug, newName: name });

      if (!name || typeof name !== 'string' || !name.trim()) {
        return new Response(
          JSON.stringify({ error: 'name is required' }),
          { status: 400, headers: { 'content-type': 'application/json' } }
        );
      }

      console.log('Current workspace:', { id: context.workspace.id, currentName: context.workspace.name });

      // Update the workspace name
      const updatedWorkspace = await workspaceRepo.update(context.workspace.id, { name: name.trim() });
      
      if (!updatedWorkspace) {
        console.error('Workspace update returned null:', { workspaceId: context.workspace.id, newName: name.trim() });
        return new Response(
          JSON.stringify({ error: 'Failed to update workspace - update returned null' }),
          { status: 500, headers: { 'content-type': 'application/json' } }
        );
      }

      console.log('Workspace updated successfully:', { id: updatedWorkspace.id, newName: updatedWorkspace.name });

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
      console.error('Error renaming workspace:', {
        error: error,
        message: error?.message,
        stack: error?.stack,
        code: error?.code,
        detail: error?.detail
      });
      return new Response(
        JSON.stringify({ 
          error: error?.message || 'Failed to rename workspace',
          details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
        }),
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
