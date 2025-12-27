import { NextRequest, NextResponse } from 'next/server';
import { getDbAdapter, getDbType } from '@/db/adapter';
import { getSessionCookie, validateSession } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const sessionId = await getSessionCookie();
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const user = await validateSession(sessionId);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const adapter = getDbAdapter();
    const dbType = getDbType();

    // Check if the current user is an owner or admin of an organization
    let currentUserOrgRole;
    if (dbType === 'postgres') {
      const result = await adapter.query(
        `SELECT uo.role, uo.organization_id FROM user_organizations uo WHERE uo.user_id = $1 LIMIT 1`,
        [user.id]
      );
      currentUserOrgRole = result.rows[0];
    } else {
      const stmt = adapter.prepare(
        `SELECT uo.role, uo.organization_id FROM user_organizations uo WHERE uo.user_id = ? LIMIT 1`
      );
      currentUserOrgRole = stmt.get([user.id]);
    }

    if (!currentUserOrgRole || (currentUserOrgRole.role !== 'owner' && currentUserOrgRole.role !== 'admin')) {
      return NextResponse.json({ error: 'Not authorized to remove users' }, { status: 403 });
    }

    // Check the target user's organization and role
    let targetUserOrgRole;
    if (dbType === 'postgres') {
      const result = await adapter.query(
        `SELECT uo.role, uo.organization_id FROM user_organizations uo WHERE uo.user_id = $1 LIMIT 1`,
        [userId]
      );
      targetUserOrgRole = result.rows[0];
    } else {
      const stmt = adapter.prepare(
        `SELECT uo.role, uo.organization_id FROM user_organizations uo WHERE uo.user_id = ? LIMIT 1`
      );
      targetUserOrgRole = stmt.get([userId]);
    }

    if (!targetUserOrgRole || targetUserOrgRole.organization_id !== currentUserOrgRole.organization_id) {
      return NextResponse.json({ error: 'User not found in your organization' }, { status: 404 });
    }

    // Prevent removing owners
    if (targetUserOrgRole.role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove organization owners' }, { status: 403 });
    }

    // Prevent users from removing themselves
    if (userId === user.id.toString()) {
      return NextResponse.json({ error: 'Cannot remove yourself from the organization' }, { status: 403 });
    }

    // Hard delete: Remove user from organization, workspaces, and delete the user account entirely
    // This allows clean re-invitations
    
    // 1. Remove from all workspaces in this organization
    if (dbType === 'postgres') {
      await adapter.query(
        `DELETE FROM user_workspaces 
         WHERE user_id = $1 
         AND workspace_id IN (
           SELECT id FROM workspaces WHERE organization_id = $2
         )`,
        [userId, currentUserOrgRole.organization_id]
      );
    } else {
      const stmt = adapter.prepare(
        `DELETE FROM user_workspaces 
         WHERE user_id = ? 
         AND workspace_id IN (
           SELECT id FROM workspaces WHERE organization_id = ?
         )`
      );
      stmt.run([userId, currentUserOrgRole.organization_id]);
    }

    // 2. Remove from the organization
    if (dbType === 'postgres') {
      await adapter.query(
        `DELETE FROM user_organizations WHERE user_id = $1 AND organization_id = $2`,
        [userId, currentUserOrgRole.organization_id]
      );
    } else {
      const stmt = adapter.prepare(
        `DELETE FROM user_organizations WHERE user_id = ? AND organization_id = ?`
      );
      stmt.run([userId, currentUserOrgRole.organization_id]);
    }

    // 3. Delete any pending invitations for this user
    if (dbType === 'postgres') {
      await adapter.query(
        `DELETE FROM invitations WHERE email = (SELECT email FROM users WHERE id = $1)`,
        [userId]
      );
    } else {
      // Get user email first, then delete invitations
      const userStmt = adapter.prepare('SELECT email FROM users WHERE id = ?');
      const userResult = userStmt.get([userId]);
      if (userResult) {
        const inviteStmt = adapter.prepare('DELETE FROM invitations WHERE email = ?');
        inviteStmt.run([userResult.email]);
      }
    }

    // 4. Delete the user account entirely
    if (dbType === 'postgres') {
      await adapter.query(`DELETE FROM users WHERE id = $1`, [userId]);
    } else {
      const stmt = adapter.prepare('DELETE FROM users WHERE id = ?');
      stmt.run([userId]);
    }

    return NextResponse.json({ message: 'User deleted successfully and can be re-invited' });

  } catch (error) {
    console.error('Error removing user from organization:', error);
    return NextResponse.json(
      { error: 'Failed to remove user from organization' },
      { status: 500 }
    );
  }
}
