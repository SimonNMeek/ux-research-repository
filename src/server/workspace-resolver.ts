import { NextRequest } from 'next/server';
import { WorkspaceRepo } from './repo/workspace';
import { OrganizationRepo } from './repo/organization';
import { getSessionCookie, validateSession, User } from '@/lib/auth';

export interface WorkspaceContext {
  organization: {
    id: number;
    slug: string;
    name: string;
  };
  workspace: {
    id: number;
    slug: string;
    name: string;
  };
  user: User;
  organizationRole: 'owner' | 'admin' | 'member';
  workspaceRole: 'owner' | 'admin' | 'member' | 'viewer';
}

export class WorkspaceResolver {
  private workspaceRepo = new WorkspaceRepo();
  private organizationRepo = new OrganizationRepo();

  /**
   * Resolve workspace from URL params and validate access
   * Now includes organization context for true multi-tenancy
   */
  async resolveFromParams(params: { ws: string } | Promise<{ ws: string }>): Promise<WorkspaceContext> {
    const resolved = params instanceof Promise ? await params : params;
    const workspaceSlug = resolved.ws;

    if (!workspaceSlug) {
      throw new Error('Workspace slug is required');
    }

    const workspace = await this.workspaceRepo.getBySlug(workspaceSlug);
    if (!workspace) {
      throw new Error(`Workspace '${workspaceSlug}' not found`);
    }

    // Get organization for this workspace
    const organization = await this.organizationRepo.getById(workspace.organization_id);
    if (!organization) {
      throw new Error('Workspace organization not found');
    }

    // Get authenticated user - REQUIRED for workspace access
    const sessionId = await getSessionCookie();
    if (!sessionId) {
      throw new Error('Authentication required');
    }

    const user = await validateSession(sessionId);
    if (!user) {
      throw new Error('Invalid or expired session');
    }

    // CRITICAL SECURITY: Check organization AND workspace access
    // Super admins bypass this check
    if (user.system_role !== 'super_admin') {
      const db = (await import('@/db')).getDb();
      
      // Check organization access
      const orgAccess = db
        .prepare(`
          SELECT role FROM user_organizations 
          WHERE user_id = ? AND organization_id = ?
        `)
        .get(user.id, organization.id) as { role: 'owner' | 'admin' | 'member' } | undefined;

      if (!orgAccess) {
        throw new Error(`Access denied to organization '${organization.slug}'`);
      }

      // Check workspace access
      const workspaceAccess = db
        .prepare(`
          SELECT role FROM user_workspaces 
          WHERE user_id = ? AND workspace_id = ?
        `)
        .get(user.id, workspace.id) as { role: 'owner' | 'admin' | 'member' | 'viewer' } | undefined;

      if (!workspaceAccess) {
        throw new Error(`Access denied to workspace '${workspaceSlug}'`);
      }

      return {
        organization: {
          id: organization.id,
          slug: organization.slug,
          name: organization.name
        },
        workspace: {
          id: workspace.id,
          slug: workspace.slug,
          name: workspace.name
        },
        user,
        organizationRole: orgAccess.role,
        workspaceRole: workspaceAccess.role
      };
    }

    // Super admin gets owner-level access to everything
    return {
      organization: {
        id: organization.id,
        slug: organization.slug,
        name: organization.name
      },
      workspace: {
        id: workspace.id,
        slug: workspace.slug,
        name: workspace.name
      },
      user,
      organizationRole: 'owner',
      workspaceRole: 'owner'
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

  /**
   * Check if user can modify workspace (owner/admin only)
   */
  canModifyWorkspace(context: WorkspaceContext): boolean {
    return context.workspaceRole === 'owner' || context.workspaceRole === 'admin';
  }

  /**
   * Check if user can create/delete projects (owner/admin only)
   */
  canManageProjects(context: WorkspaceContext): boolean {
    return context.workspaceRole === 'owner' || context.workspaceRole === 'admin';
  }

  /**
   * Check if user can create/edit documents (owner/admin/member)
   */
  canEditDocuments(context: WorkspaceContext): boolean {
    return context.workspaceRole === 'owner' || 
           context.workspaceRole === 'admin' || 
           context.workspaceRole === 'member';
  }

  /**
   * Check if user can view workspace (all roles)
   */
  canViewWorkspace(context: WorkspaceContext): boolean {
    return true; // If they got past resolveFromParams, they can view
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
