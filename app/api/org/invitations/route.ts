import { NextRequest, NextResponse } from 'next/server';
import { getDbAdapter, getDbType } from '@/db/adapter';
import { getSessionCookie, validateSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
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

    // Get user's organization
    let organization;
    if (dbType === 'postgres') {
      const orgResult = await adapter.query(
        `SELECT o.id, o.name, o.slug 
         FROM organizations o
         INNER JOIN user_organizations uo ON o.id = uo.organization_id
         WHERE uo.user_id = $1
         LIMIT 1`,
        [user.id]
      );
      organization = orgResult.rows[0];
    } else {
      const orgStmt = adapter.prepare(
        `SELECT o.id, o.name, o.slug 
         FROM organizations o
         INNER JOIN user_organizations uo ON o.id = uo.organization_id
         WHERE uo.user_id = ?
         LIMIT 1`
      );
      organization = orgStmt.get([user.id]);
    }

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Get current user's role in the organization
    let currentUserRole;
    if (dbType === 'postgres') {
      const roleResult = await adapter.query(
        `SELECT role FROM user_organizations WHERE user_id = $1 AND organization_id = $2`,
        [user.id, organization.id]
      );
      currentUserRole = roleResult.rows[0]?.role;
    } else {
      const roleStmt = adapter.prepare(
        `SELECT role FROM user_organizations WHERE user_id = ? AND organization_id = ?`
      );
      const roleRow = roleStmt.get([user.id, organization.id]) as { role: string } | undefined;
      currentUserRole = roleRow?.role;
    }

    // Check if user has admin or owner role
    if (currentUserRole !== 'admin' && currentUserRole !== 'owner') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    // Fetch pending invitations for the user's organization
    let result;
    if (dbType === 'postgres') {
      result = await adapter.query(`
        SELECT 
          i.id,
          i.email,
          i.role,
          i.status,
          i.created_at,
          i.expires_at,
          u.name as invited_by_name,
          u.email as invited_by_email
        FROM invitations i
        LEFT JOIN users u ON i.invited_by = u.id
        WHERE i.organization_id = $1 AND i.status = 'pending'
        ORDER BY i.created_at DESC
      `, [organization.id]);
    } else {
      const stmt = adapter.prepare(`
        SELECT 
          i.id,
          i.email,
          i.role,
          i.status,
          i.created_at,
          i.expires_at,
          u.name as invited_by_name,
          u.email as invited_by_email
        FROM invitations i
        LEFT JOIN users u ON i.invited_by = u.id
        WHERE i.organization_id = ? AND i.status = 'pending'
        ORDER BY i.created_at DESC
      `);
      result = { rows: stmt.all([organization.id]) };
    }
    
    const invitations = result.rows;

    return NextResponse.json({ invitations });
  } catch (error) {
    console.error('Error fetching pending invitations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending invitations' },
      { status: 500 }
    );
  }
}
