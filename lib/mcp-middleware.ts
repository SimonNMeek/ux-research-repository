/**
 * Middleware for MCP API endpoints
 * Handles Bearer token authentication and workspace resolution
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, ApiKeyUser, trackApiUsage } from './api-auth';
import { query } from '@/db/postgres';

export interface McpContext {
  user: ApiKeyUser;
  workspace?: {
    id: number;
    slug: string;
    name: string;
    organization_id: number;
  };
  organization?: {
    id: number;
    name: string;
    slug: string;
  };
}

/**
 * Extract Bearer token from Authorization header
 */
function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // Remove "Bearer " prefix
}

/**
 * Authenticate API request using Bearer token
 */
export async function authenticateMcpRequest(
  request: NextRequest
): Promise<{ user: ApiKeyUser } | NextResponse> {
  const token = extractBearerToken(request);

  if (!token) {
    return NextResponse.json(
      { error: 'Missing or invalid Authorization header. Use: Authorization: Bearer sk-...' },
      { status: 401 }
    );
  }

  const user = await validateApiKey(token);

  if (!user) {
    return NextResponse.json(
      { error: 'Invalid or expired API key' },
      { status: 401 }
    );
  }

  return { user };
}

/**
 * Resolve workspace from request (either from path param or query string)
 */
export async function resolveWorkspace(
  user: ApiKeyUser,
  workspaceSlug?: string
): Promise<
  | {
      id: number;
      slug: string;
      name: string;
      organization_id: number;
    }
  | null
> {
  if (!workspaceSlug) {
    return null;
  }

  const result = await query<{
    id: number;
    slug: string;
    name: string;
    organization_id: number;
  }>(
    `SELECT id, slug, name, organization_id FROM workspaces WHERE slug = $1`,
    [workspaceSlug]
  );

  const workspace = result.rows[0];
  if (!workspace) {
    return null;
  }

  if (user.system_role !== 'super_admin') {
    let hasAccess = true;

    if (user.scope_type === 'organization') {
      hasAccess = user.organization_id === workspace.organization_id;
    } else {
      const accessResult = await query(
        `SELECT 1 FROM user_workspaces WHERE user_id = $1 AND workspace_id = $2`,
        [user.id, workspace.id]
      );
      hasAccess = (accessResult.rowCount ?? 0) > 0;
    }

    if (!hasAccess) {
      return null;
    }
  }

  return workspace;
}

/**
 * Resolve organization context for organization-scoped API keys
 */
export async function resolveOrganization(
  user: ApiKeyUser
): Promise<
  | {
      id: number;
      name: string;
      slug: string;
    }
  | null
> {
  if (user.scope_type !== 'organization' || !user.organization_id) {
    return null;
  }

  const result = await query<{ id: number; name: string; slug: string }>(
    'SELECT id, name, slug FROM organizations WHERE id = $1',
    [user.organization_id]
  );

  return result.rows[0] ?? null;
}

/**
 * Track API usage for the request
 */
export async function trackMcpUsage(
  user: ApiKeyUser,
  endpoint: string,
  workspaceId?: number
): Promise<void> {
  try {
    await trackApiUsage(
      user.api_key_id, 
      endpoint, 
      workspaceId, 
      user.organization_id
    );
  } catch (error) {
    console.error('Error tracking API usage:', error);
    // Don't fail the request if tracking fails
  }
}

/**
 * Add CORS headers to response
 */
function addCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
}

/**
 * Higher-order function to wrap MCP endpoints with authentication
 */
export function withMcpAuth(
  handler: (context: McpContext, request: NextRequest) => Promise<Response>
) {
  return async (request: NextRequest) => {
    // Handle preflight OPTIONS requests
    if (request.method === 'OPTIONS') {
      return addCorsHeaders(new NextResponse(null, { status: 200 }));
    }

    try {
      const authResult = await authenticateMcpRequest(request);

      if (authResult instanceof NextResponse) {
        return addCorsHeaders(authResult); // Return error response with CORS
      }

      const { user } = authResult;

      // Try to resolve workspace from query param or path
      const url = new URL(request.url);
      const workspaceSlug = url.searchParams.get('workspace') || undefined;

      let workspace: McpContext['workspace'];
      if (workspaceSlug) {
        const resolved = await resolveWorkspace(user, workspaceSlug);
        if (!resolved) {
          const errorResponse = NextResponse.json(
            { error: `Workspace '${workspaceSlug}' not found or access denied` },
            { status: 404 }
          );
          return addCorsHeaders(errorResponse);
        }
        workspace = resolved;
      }

      // Resolve organization context for organization-scoped API keys
      const organization = await resolveOrganization(user);

      const context: McpContext = { user, workspace, organization };

      const response = await handler(context, request);
      return addCorsHeaders(response);
    } catch (error: any) {
      console.error('MCP API error:', error);
      const errorResponse = NextResponse.json(
        { error: 'Internal server error', message: error.message },
        { status: 500 }
      );
      return addCorsHeaders(errorResponse);
    }
  };
}

