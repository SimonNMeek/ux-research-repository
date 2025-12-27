import { NextRequest } from 'next/server';
import { withWorkspace, WorkspaceRouteHandler, workspaceResolver } from '@/src/server/workspace-resolver';
import { getDb } from '@/db';

export const runtime = 'nodejs';

const handler: WorkspaceRouteHandler = async (context, req) => {
  const { workspace, user } = context;
  const db = getDb();

  // GET - List users with access to workspace
  if (req.method === 'GET') {
    try {
      const users = db
        .prepare(`
          SELECT 
            u.id,
            u.email,
            u.name,
            u.first_name,
            u.last_name,
            u.system_role,
            uw.role as workspace_role,
            uw.granted_at,
            uw.granted_by
          FROM users u
          INNER JOIN user_workspaces uw ON u.id = uw.user_id
          WHERE uw.workspace_id = ?
          ORDER BY u.name
        `)
        .all(workspace.id);

      return new Response(
        JSON.stringify({ users }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error.message || 'Failed to fetch users' }),
        { status: 500, headers: { 'content-type': 'application/json' } }
      );
    }
  }

  // POST - Invite user to workspace
  if (req.method === 'POST') {
    // Only owners/admins can invite users
    if (!workspaceResolver.canModifyWorkspace(context)) {
      return new Response(
        JSON.stringify({ error: 'Only workspace owners and admins can invite users' }),
        { status: 403, headers: { 'content-type': 'application/json' } }
      );
    }

    try {
      const body = await req.json();
      const { email, role = 'member' } = body;

      if (!email) {
        return new Response(
          JSON.stringify({ error: 'Email is required' }),
          { status: 400, headers: { 'content-type': 'application/json' } }
        );
      }

      // Validate role
      if (!['owner', 'admin', 'member', 'viewer'].includes(role)) {
        return new Response(
          JSON.stringify({ error: 'Invalid role. Must be owner, admin, member, or viewer' }),
          { status: 400, headers: { 'content-type': 'application/json' } }
        );
      }

      // Find user by email
      const targetUser = db
        .prepare('SELECT id, email, name FROM users WHERE email = ?')
        .get(email) as { id: number; email: string; name: string } | undefined;

      if (!targetUser) {
        return new Response(
          JSON.stringify({ error: 'User not found. They must sign up first.' }),
          { status: 404, headers: { 'content-type': 'application/json' } }
        );
      }

      // Check if user already has access
      const existing = db
        .prepare('SELECT role FROM user_workspaces WHERE user_id = ? AND workspace_id = ?')
        .get(targetUser.id, workspace.id) as { role: string } | undefined;

      if (existing) {
        return new Response(
          JSON.stringify({ 
            error: 'User already has access to this workspace',
            current_role: existing.role 
          }),
          { status: 409, headers: { 'content-type': 'application/json' } }
        );
      }

      // Grant access
      db.prepare(`
        INSERT INTO user_workspaces (user_id, workspace_id, role, granted_by)
        VALUES (?, ?, ?, ?)
      `).run(targetUser.id, workspace.id, role, user.id);

      return new Response(
        JSON.stringify({ 
          success: true,
          message: `${targetUser.email} has been granted ${role} access to ${workspace.name}`,
          user: {
            id: targetUser.id,
            email: targetUser.email,
            name: targetUser.name,
            workspace_role: role
          }
        }),
        { status: 201, headers: { 'content-type': 'application/json' } }
      );
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error.message || 'Failed to invite user' }),
        { status: 500, headers: { 'content-type': 'application/json' } }
      );
    }
  }

  // DELETE - Remove user from workspace
  if (req.method === 'DELETE') {
    // Only owners/admins can remove users
    if (!workspaceResolver.canModifyWorkspace(context)) {
      return new Response(
        JSON.stringify({ error: 'Only workspace owners and admins can remove users' }),
        { status: 403, headers: { 'content-type': 'application/json' } }
      );
    }

    try {
      const url = new URL(req.url);
      const userIdToRemove = url.searchParams.get('userId');

      if (!userIdToRemove) {
        return new Response(
          JSON.stringify({ error: 'userId query parameter is required' }),
          { status: 400, headers: { 'content-type': 'application/json' } }
        );
      }

      // Don't allow removing yourself
      if (parseInt(userIdToRemove) === user.id) {
        return new Response(
          JSON.stringify({ error: 'You cannot remove yourself from the workspace' }),
          { status: 400, headers: { 'content-type': 'application/json' } }
        );
      }

      // Remove access
      const result = db
        .prepare('DELETE FROM user_workspaces WHERE user_id = ? AND workspace_id = ?')
        .run(parseInt(userIdToRemove), workspace.id);

      if (result.changes === 0) {
        return new Response(
          JSON.stringify({ error: 'User does not have access to this workspace' }),
          { status: 404, headers: { 'content-type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'User has been removed from the workspace'
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error.message || 'Failed to remove user' }),
        { status: 500, headers: { 'content-type': 'application/json' } }
      );
    }
  }

  // PATCH - Update user role
  if (req.method === 'PATCH') {
    // Only owners/admins can change roles
    if (!workspaceResolver.canModifyWorkspace(context)) {
      return new Response(
        JSON.stringify({ error: 'Only workspace owners and admins can change user roles' }),
        { status: 403, headers: { 'content-type': 'application/json' } }
      );
    }

    try {
      const body = await req.json();
      const { userId, role } = body;

      if (!userId || !role) {
        return new Response(
          JSON.stringify({ error: 'userId and role are required' }),
          { status: 400, headers: { 'content-type': 'application/json' } }
        );
      }

      // Validate role
      if (!['owner', 'admin', 'member', 'viewer'].includes(role)) {
        return new Response(
          JSON.stringify({ error: 'Invalid role. Must be owner, admin, member, or viewer' }),
          { status: 400, headers: { 'content-type': 'application/json' } }
        );
      }

      // Don't allow changing your own role
      if (parseInt(userId) === user.id) {
        return new Response(
          JSON.stringify({ error: 'You cannot change your own role' }),
          { status: 400, headers: { 'content-type': 'application/json' } }
        );
      }

      // Update role
      const result = db
        .prepare('UPDATE user_workspaces SET role = ? WHERE user_id = ? AND workspace_id = ?')
        .run(role, parseInt(userId), workspace.id);

      if (result.changes === 0) {
        return new Response(
          JSON.stringify({ error: 'User does not have access to this workspace' }),
          { status: 404, headers: { 'content-type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          message: `User role has been updated to ${role}`
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error.message || 'Failed to update user role' }),
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

export async function DELETE(req: NextRequest, params: { params: { ws: string } | Promise<{ ws: string }> }) {
  return withWorkspace(handler, req, params);
}

export async function PATCH(req: NextRequest, params: { params: { ws: string } | Promise<{ ws: string }> }) {
  return withWorkspace(handler, req, params);
}

