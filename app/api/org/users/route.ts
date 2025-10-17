import { NextRequest, NextResponse } from 'next/server';
import { getDbAdapter, getDbType } from '@/db/adapter';
import { getSessionCookie, validateSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const sessionId = getSessionCookie();
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const user = await validateSession(sessionId);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const adapter = getDbAdapter();
    const dbType = getDbType();

    // Get user's organization (assuming they're in one organization for now)
    let organization;
    if (dbType === 'postgres') {
      const orgResult = await adapter.query(
        `SELECT o.id, o.name, o.slug 
         FROM organizations o
         INNER JOIN user_organizations uo ON o.id = uo.organization_id
         WHERE uo.user_id = $1 AND uo.role = 'owner'
         LIMIT 1`,
        [user.id]
      );
      organization = orgResult.rows[0];
    } else {
      const orgStmt = adapter.prepare(
        `SELECT o.id, o.name, o.slug 
         FROM organizations o
         INNER JOIN user_organizations uo ON o.id = uo.organization_id
         WHERE uo.user_id = ? AND uo.role = 'owner'
         LIMIT 1`
      );
      organization = orgStmt.get([user.id]);
    }

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found or insufficient permissions' }, { status: 404 });
    }

    // Get all users in the organization
    let users;
    if (dbType === 'postgres') {
      const usersResult = await adapter.query(
        `SELECT u.id, u.email, u.name, u.first_name, u.last_name, uo.role, uo.joined_at, u.is_active
         FROM users u
         INNER JOIN user_organizations uo ON u.id = uo.user_id
         WHERE uo.organization_id = $1
         ORDER BY uo.joined_at DESC`,
        [organization.id]
      );
      users = usersResult.rows;
    } else {
      const usersStmt = adapter.prepare(
        `SELECT u.id, u.email, u.name, u.first_name, u.last_name, uo.role, uo.joined_at, u.is_active
         FROM users u
         INNER JOIN user_organizations uo ON u.id = uo.user_id
         WHERE uo.organization_id = ?
         ORDER BY uo.joined_at DESC`
      );
      users = usersStmt.all([organization.id]);
    }

    return NextResponse.json({
      organization,
      users
    });

  } catch (error) {
    console.error('Error fetching organization users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization users' },
      { status: 500 }
    );
  }
}
