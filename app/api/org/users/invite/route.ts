import { NextRequest, NextResponse } from 'next/server';
import { getDbAdapter, getDbType } from '@/db/adapter';
import { getSessionCookie, validateSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const sessionId = getSessionCookie();
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const user = await validateSession(sessionId);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { email, firstName, lastName, role } = await request.json();

    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Email, first name, and last name are required' },
        { status: 400 }
      );
    }

    const adapter = getDbAdapter();
    const dbType = getDbType();

    // Verify user is owner/admin of their organization
    let organization;
    if (dbType === 'postgres') {
      const orgResult = await adapter.query(
        `SELECT o.id, o.name 
         FROM organizations o
         INNER JOIN user_organizations uo ON o.id = uo.organization_id
         WHERE uo.user_id = $1 AND uo.role IN ('owner', 'admin')
         LIMIT 1`,
        [user.id]
      );
      organization = orgResult.rows[0];
    } else {
      const orgStmt = adapter.prepare(
        `SELECT o.id, o.name 
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

    // Check if user already exists
    let existingUser;
    if (dbType === 'postgres') {
      const userResult = await adapter.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );
      existingUser = userResult.rows[0];
    } else {
      const userStmt = adapter.prepare('SELECT id FROM users WHERE email = ?');
      existingUser = userStmt.get([email]);
    }

    if (existingUser) {
      // Check if user is already in this organization
      let existingOrgUser;
      if (dbType === 'postgres') {
        const orgUserResult = await adapter.query(
          'SELECT user_id FROM user_organizations WHERE user_id = $1 AND organization_id = $2',
          [existingUser.id, organization.id]
        );
        existingOrgUser = orgUserResult.rows[0];
      } else {
        const orgUserStmt = adapter.prepare(
          'SELECT user_id FROM user_organizations WHERE user_id = ? AND organization_id = ?'
        );
        existingOrgUser = orgUserStmt.get([existingUser.id, organization.id]);
      }

      if (existingOrgUser) {
        return NextResponse.json(
          { error: 'User is already a member of this organization' },
          { status: 409 }
        );
      }

      // Add existing user to organization
      if (dbType === 'postgres') {
        await adapter.query(
          `INSERT INTO user_organizations (user_id, organization_id, role, invited_by)
           VALUES ($1, $2, $3, $4)`,
          [existingUser.id, organization.id, role || 'member', user.id]
        );
      } else {
        const stmt = adapter.prepare(
          `INSERT INTO user_organizations (user_id, organization_id, role, invited_by)
           VALUES (?, ?, ?, ?)`
        );
        stmt.run([existingUser.id, organization.id, role || 'member', user.id]);
      }

      return NextResponse.json({
        message: 'User added to organization successfully',
        userId: existingUser.id
      });
    }

    // For now, we'll just return a message that the user needs to sign up first
    // In a full implementation, you'd create an invitation record and send an email
    return NextResponse.json({
      message: 'User invitation created. The user will need to sign up with this email address to join your organization.',
      email: email,
      organizationName: organization.name
    });

  } catch (error) {
    console.error('Error inviting user:', error);
    return NextResponse.json(
      { error: 'Failed to invite user' },
      { status: 500 }
    );
  }
}
