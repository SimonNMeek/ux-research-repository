import { NextRequest } from 'next/server';
import { withWorkspace, WorkspaceRouteHandler } from '../../../../../../src/server/workspace-resolver';
import { ProjectRepo } from '../../../../../../src/server/repo/project';
import { getDb } from '@/db';

export const runtime = 'nodejs';

const projectRepo = new ProjectRepo();

const handler: WorkspaceRouteHandler = async (context, req, routeParams) => {
  const { workspace, user } = context;
  
  // Extract projectSlug from params
  const params = routeParams.params instanceof Promise ? await routeParams.params : routeParams.params;
  const projectSlug = params.projectSlug;

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
      const project = projectRepo.getBySlug(workspace.id, projectSlug);
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

export async function DELETE(req: NextRequest, params: { params: { ws: string; projectSlug: string } | Promise<{ ws: string; projectSlug: string }> }) {
  return withWorkspace(handler, req, params);
}
