import { NextRequest } from 'next/server';
import { WorkspaceRepo } from './repo/workspace';

export interface WorkspaceContext {
  workspace: {
    id: number;
    slug: string;
    name: string;
  };
}

export class WorkspaceResolver {
  private workspaceRepo = new WorkspaceRepo();

  /**
   * Resolve workspace from URL params and validate access
   */
  async resolveFromParams(params: { ws: string } | Promise<{ ws: string }>): Promise<WorkspaceContext> {
    const resolved = params instanceof Promise ? await params : params;
    const workspaceSlug = resolved.ws;

    if (!workspaceSlug) {
      throw new Error('Workspace slug is required');
    }

    const workspace = this.workspaceRepo.getBySlug(workspaceSlug);
    if (!workspace) {
      throw new Error(`Workspace '${workspaceSlug}' not found`);
    }

    return {
      workspace: {
        id: workspace.id,
        slug: workspace.slug,
        name: workspace.name
      }
    };
  }

  /**
   * Validate that a project belongs to the given workspace
   */
  validateProjectInWorkspace(workspaceId: number, projectWorkspaceId: number): void {
    if (workspaceId !== projectWorkspaceId) {
      throw new Error('Project not in active workspace');
    }
  }

  /**
   * Validate that a document belongs to the given workspace (via its project)
   */
  validateDocumentInWorkspace(workspaceId: number, documentWorkspaceId: number): void {
    if (workspaceId !== documentWorkspaceId) {
      throw new Error('Document not in active workspace');
    }
  }
}

// Singleton instance
export const workspaceResolver = new WorkspaceResolver();

/**
 * Simple helper function to resolve workspace ID from slug
 */
export async function resolveWorkspace(slug: string): Promise<number> {
  const context = await workspaceResolver.resolveFromParams({ ws: slug });
  return context.workspace.id;
}

/**
 * Middleware helper to extract workspace context from route params
 */
export async function withWorkspace<T extends { params: { ws: string } | Promise<{ ws: string }> }>(
  handler: (context: WorkspaceContext, ...args: any[]) => Promise<Response>,
  req: NextRequest,
  routeParams: T
): Promise<Response> {
  try {
    const context = await workspaceResolver.resolveFromParams(routeParams.params);
    return await handler(context, req, routeParams);
  } catch (error: any) {
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Workspace resolution failed',
        code: 'WORKSPACE_ERROR'
      }),
      { 
        status: error.message?.includes('not found') ? 404 : 400,
        headers: { 'content-type': 'application/json' }
      }
    );
  }
}

/**
 * Type helper for workspace-scoped route handlers
 */
export type WorkspaceRouteHandler = (
  context: WorkspaceContext,
  req: NextRequest,
  params: any
) => Promise<Response>;
