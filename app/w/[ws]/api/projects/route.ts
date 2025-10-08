import { NextRequest } from 'next/server';
import { withWorkspace, WorkspaceRouteHandler } from '../../../../../src/server/workspace-resolver';
import { ProjectRepo } from '../../../../../src/server/repo/project';
import { canCreateProject, getPermissionErrorMessage, PERMISSIONS } from '@/lib/permissions';

export const runtime = 'nodejs';

const projectRepo = new ProjectRepo();

const handler: WorkspaceRouteHandler = async (context, req) => {
  const { workspace, user } = context;

  if (req.method === 'GET') {
    try {
      const projects = projectRepo.listByWorkspaceWithDocumentCounts(workspace.id);
      return new Response(
        JSON.stringify({ projects }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' }
        }
      );
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error.message || 'Failed to fetch projects' }),
        { status: 500, headers: { 'content-type': 'application/json' } }
      );
    }
  }

  if (req.method === 'POST') {
    // Check authentication
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'content-type': 'application/json' } }
      );
    }

    // Check permissions
    if (!canCreateProject(user)) {
      return new Response(
        JSON.stringify({ error: getPermissionErrorMessage(PERMISSIONS.CREATE_PROJECT) }),
        { status: 403, headers: { 'content-type': 'application/json' } }
      );
    }

    try {
      const body = await req.json();
      const { slug, name, description } = body;

      if (!slug || !name) {
        return new Response(
          JSON.stringify({ error: 'slug and name are required' }),
          { status: 400, headers: { 'content-type': 'application/json' } }
        );
      }

      // Validate slug format (alphanumeric + hyphens)
      if (!/^[a-z0-9-]+$/.test(slug)) {
        return new Response(
          JSON.stringify({ error: 'slug must contain only lowercase letters, numbers, and hyphens' }),
          { status: 400, headers: { 'content-type': 'application/json' } }
        );
      }

      // Check if project with this slug already exists
      const existing = projectRepo.getBySlug(workspace.id, slug);
      if (existing) {
        return new Response(
          JSON.stringify({ error: 'Project with this slug already exists' }),
          { status: 409, headers: { 'content-type': 'application/json' } }
        );
      }

      const project = projectRepo.create(workspace.id, {
        slug,
        name,
        description: description || ''
      });

      return new Response(
        JSON.stringify({ project }),
        {
          status: 201,
          headers: { 'content-type': 'application/json' }
        }
      );
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error.message || 'Failed to create project' }),
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
