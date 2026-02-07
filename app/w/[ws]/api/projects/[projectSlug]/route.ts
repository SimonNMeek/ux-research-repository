import { NextRequest } from 'next/server';
import { withWorkspace, WorkspaceRouteHandler, workspaceResolver } from '../../../../../../src/server/workspace-resolver';
import { ProjectRepo } from '../../../../../../src/server/repo/project';
import { getDb } from '@/db';

export const runtime = 'nodejs';

const projectRepo = new ProjectRepo();

const handler: WorkspaceRouteHandler = async (context, req, routeParams) => {
  const { workspace, user } = context;
  
  // Extract projectSlug from params
  const params = routeParams.params instanceof Promise ? await routeParams.params : routeParams.params;
  const projectSlug = params.projectSlug;

  if (req.method === 'POST') {
    // Check permissions - only owner/admin can rename projects
    if (!workspaceResolver.canManageProjects(context)) {
      return new Response(
        JSON.stringify({ error: 'You do not have permission to rename projects in this workspace' }),
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

      // Get the project to ensure it exists and belongs to this workspace
      const project = await projectRepo.getBySlug(workspace.id, projectSlug);
      if (!project) {
        return new Response(
          JSON.stringify({ error: 'Project not found' }),
          { status: 404, headers: { 'content-type': 'application/json' } }
        );
      }

      // Update the project name
      const updatedProject = await projectRepo.update(project.id, { name: name.trim() });
      
      if (!updatedProject) {
        return new Response(
          JSON.stringify({ error: 'Failed to update project' }),
          { status: 500, headers: { 'content-type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ project: updatedProject }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    } catch (error: any) {
      console.error('Error renaming project:', error);
      return new Response(
        JSON.stringify({ error: error.message || 'Failed to rename project' }),
        { status: 500, headers: { 'content-type': 'application/json' } }
      );
    }
  }

  if (req.method === 'DELETE') {
    // Only super_admins can delete projects
    if (!user || user.system_role !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Only Super Admins can delete projects' }),
        { status: 403, headers: { 'content-type': 'application/json' } }
      );
    }

    try {
      // Get the project to ensure it exists and belongs to this workspace
      const project = await projectRepo.getBySlug(workspace.id, projectSlug);
      if (!project) {
        return new Response(
          JSON.stringify({ error: 'Project not found' }),
          { status: 404, headers: { 'content-type': 'application/json' } }
        );
      }

      // Delete all documents in the project first
      const db = getDb();
      db.prepare(`DELETE FROM documents WHERE project_id = ?`).run(project.id);

      // Delete the project
      db.prepare(`DELETE FROM projects WHERE id = ?`).run(project.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Project and all associated documents deleted successfully' 
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    } catch (error: any) {
      console.error('Error deleting project:', error);
      return new Response(
        JSON.stringify({ error: error.message || 'Failed to delete project' }),
        { status: 500, headers: { 'content-type': 'application/json' } }
      );
    }
  }

  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    { status: 405, headers: { 'content-type': 'application/json' } }
  );
};

export async function POST(req: NextRequest, params: { params: { ws: string; projectSlug: string } | Promise<{ ws: string; projectSlug: string }> }) {
  return withWorkspace(handler, req, params);
}

export async function DELETE(req: NextRequest, params: { params: { ws: string; projectSlug: string } | Promise<{ ws: string; projectSlug: string }> }) {
  return withWorkspace(handler, req, params);
}
