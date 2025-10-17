import { NextRequest, NextResponse } from 'next/server';
import { getDbAdapter, getDbType } from '@/db/adapter';
import { getSessionCookie, validateSession } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const sessionId = getSessionCookie();
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const user = await validateSession(sessionId);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { role } = await request.json();
    const targetUserId = parseInt(params.userId);

    if (!role || !['member', 'admin'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "member" or "admin"' },
        { status: 400 }
      );
    }

    const adapter = getDbAdapter();
    const dbType = getDbType();

    // Verify user is owner/admin of their organization
    let organization;
    if (dbType === 'postgres') {
      const orgResult = await adapter.query(
        `SELECT o.id 
         FROM organizations o
         INNER JOIN user_organizations uo ON o.id = uo.organization_id
         WHERE uo.user_id = $1 AND uo.role IN ('owner', 'admin')
         LIMIT 1`,
        [user.id]
      );
      organization = orgResult.rows[0];
    } else {
      const orgStmt = adapter.prepare(
        `SELECT o.id 
         FROM organizations o
         INNER JOIN user_organizations uo ON o.id = uo.organization_id
         WHERE uo.user_id = ? AND uo.role IN ('owner', 'admin')
         LIMIT 1`
      );
      organization = orgStmt.get([user.id]);
    }

    if (!organization) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Verify target user is in the same organization
    let targetUserOrg;
    if (dbType === 'postgres') {
      const targetResult = await adapter.query(
        `SELECT role FROM user_organizations 
         WHERE user_id = $1 AND organization_id = $2`,
        [targetUserId, organization.id]
      );
      targetUserOrg = targetResult.rows[0];
    } else {
      const targetStmt = adapter.prepare(
        `SELECT role FROM user_organizations 
         WHERE user_id = ? AND organization_id = ?`
      );
      targetUserOrg = targetStmt.get([targetUserId, organization.id]);
    }

    if (!targetUserOrg) {
      return NextResponse.json(
        { error: 'User not found in organization' },
        { status: 404 }
      );
    }

    // Prevent changing owner role
    if (targetUserOrg.role === 'owner') {
      return NextResponse.json(
        { error: 'Cannot change owner role' },
        { status: 403 }
      );
    }

    // Update user role
    if (dbType === 'postgres') {
      await adapter.query(
        `UPDATE user_organizations 
         SET role = $1 
         WHERE user_id = $2 AND organization_id = $3`,
        [role, targetUserId, organization.id]
      );
    } else {
      const stmt = adapter.prepare(
        `UPDATE user_organizations 
         SET role = ? 
         WHERE user_id = ? AND organization_id = ?`
      );
      stmt.run([role, targetUserId, organization.id]);
    }

    return NextResponse.json({
      message: 'User role updated successfully',
      userId: targetUserId,
      newRole: role
    });

  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json(
      { error: 'Failed to update user role' },
      { status: 500 }
    );
  }
}
