import { NextRequest } from 'next/server';
import { WorkspaceRepo } from './repo/workspace';
import { OrganizationRepo } from './repo/organization';
import { getSessionCookie, validateSession, User } from '@/lib/auth';
import { query } from '@/db/postgres';

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

    // Add retry logic for workspace lookup
    let workspace;
    let retries = 3;
    
    while (retries > 0) {
      try {
        workspace = await this.workspaceRepo.getBySlug(workspaceSlug);
        break; // Success, exit retry loop
      } catch (error: any) {
        retries--;
        console.error(`Workspace lookup error (retry ${3 - retries}/3):`, error);
        
        if (retries > 0 && (error.message?.includes('ETIMEDOUT') || error.code === 'ETIMEDOUT')) {
          console.log(`Retrying workspace lookup for '${workspaceSlug}'... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between retries
          continue;
        } else {
          // All retries failed or non-timeout error
          throw error;
        }
      }
    }
    
    if (!workspace) {
      throw new Error(`Workspace '${workspaceSlug}' not found`);
    }

    // Get organization for this workspace with retry logic
    let organization;
    retries = 3;
    
    while (retries > 0) {
      try {
        organization = await this.organizationRepo.getById(workspace.organization_id);
        break; // Success, exit retry loop
      } catch (error: any) {
        retries--;
        console.error(`Organization lookup error (retry ${3 - retries}/3):`, error);
        
        if (retries > 0 && (error.message?.includes('ETIMEDOUT') || error.code === 'ETIMEDOUT')) {
          console.log(`Retrying organization lookup for workspace '${workspaceSlug}'... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between retries
          continue;
        } else {
          // All retries failed or non-timeout error
          throw error;
        }
      }
    }
    
    if (!organization) {
      throw new Error('Workspace organization not found');
    }

    // Get authenticated user - REQUIRED for workspace access
    const sessionId = await getSessionCookie();
    if (!sessionId) {
      throw new Error('Authentication required');
    }

    // Add retry logic for user validation
    let user;
    retries = 3;
    
    while (retries > 0) {
      try {
        user = await validateSession(sessionId);
        break; // Success, exit retry loop
      } catch (error: any) {
        retries--;
        console.error(`User validation error (retry ${3 - retries}/3):`, error);
        
        if (retries > 0 && (error.message?.includes('ETIMEDOUT') || error.code === 'ETIMEDOUT')) {
          console.log(`Retrying user validation for workspace '${workspaceSlug}'... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between retries
          continue;
        } else {
          // All retries failed or non-timeout error
          throw error;
        }
      }
    }
    
    if (!user) {
      throw new Error('Invalid or expired session');
    }

    // CRITICAL SECURITY: Check organization AND workspace access
    // Super admins bypass this check
    if (user.system_role !== 'super_admin') {
      let orgAccess: { role: 'owner' | 'admin' | 'member' } | undefined;
      retries = 3;

      while (retries > 0) {
        try {
          const result = await query<{ role: 'owner' | 'admin' | 'member' }>(
            `SELECT role FROM user_organizations WHERE user_id = $1 AND organization_id = $2`,
            [user.id, organization.id]
          );
          orgAccess = result.rows[0];
          break;
        } catch (error: any) {
          retries--;
          console.error(`Organization access check error (retry ${3 - retries}/3):`, error);

          if (retries > 0 && (error.message?.includes('ETIMEDOUT') || error.code === 'ETIMEDOUT')) {
            console.log(
              `Retrying organization access check for workspace '${workspaceSlug}'... (${retries} attempts left)`
            );
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }

          throw error;
        }
      }

      if (!orgAccess) {
        throw new Error(`Access denied to organization '${organization.slug}'`);
      }

      let workspaceAccess: { role: 'owner' | 'admin' | 'member' | 'viewer' } | undefined;
      retries = 3;

      while (retries > 0) {
        try {
          const result = await query<{ role: 'owner' | 'admin' | 'member' | 'viewer' }>(
            `SELECT role FROM user_workspaces WHERE user_id = $1 AND workspace_id = $2`,
            [user.id, workspace.id]
          );
          workspaceAccess = result.rows[0];
          break;
        } catch (error: any) {
          retries--;
          console.error(`Workspace access check error (retry ${3 - retries}/3):`, error);

          if (retries > 0 && (error.message?.includes('ETIMEDOUT') || error.code === 'ETIMEDOUT')) {
            console.log(
              `Retrying workspace access check for workspace '${workspaceSlug}'... (${retries} attempts left)`
            );
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }

          throw error;
        }
      }

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
