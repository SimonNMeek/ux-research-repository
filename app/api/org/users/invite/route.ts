import { NextRequest, NextResponse } from 'next/server';
import { getDbAdapter, getDbType } from '@/db/adapter';
import { getSessionCookie, validateSession } from '@/lib/auth';
import { createInvitation, checkInvitationLimits } from '@/lib/invitations';
import { sendInvitationEmail, generateSignupUrl } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const sessionId = await getSessionCookie();
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

    // Check if user is already in this organization (regardless of whether user exists in system)
    let existingOrgUser;
    if (existingUser) {
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
    }

    // For both existing and new users, send an invitation email
    // (existing users will get a login link, new users will get a signup link)

    // Check invitation limits (10 per organization)
    const withinLimits = await checkInvitationLimits(organization.id, 10);
    if (!withinLimits) {
      return NextResponse.json(
        { error: 'You have reached the maximum number of pending invitations (10). Please wait for some to be accepted or expired.' },
        { status: 429 }
      );
    }

    // Create invitation record
    const invitationResult = await createInvitation({
      email,
      organizationId: organization.id,
      invitedBy: user.id,
      role: role || 'member'
    });

    if (!invitationResult.success) {
      return NextResponse.json(
        { error: invitationResult.error || 'Failed to create invitation' },
        { status: 500 }
      );
    }

    // Send invitation email
    const signupUrl = generateSignupUrl(invitationResult.invitation!.token);
    const emailResult = await sendInvitationEmail({
      to: email,
      organizationName: organization.name,
      inviterName: user.name,
      signupUrl,
      role: role || 'member',
      isExistingUser: !!existingUser // Pass whether user already exists
    });

    if (!emailResult.success) {
      console.error('Failed to send invitation email:', emailResult.error);
      // Still return success but log the error - invitation was created
    }

    return NextResponse.json({
      message: existingUser 
        ? 'Invitation sent successfully! The user will receive an email with instructions to accept the invitation.'
        : 'Invitation sent successfully! The user will receive an email with instructions to create an account and join your organization.',
      email: email,
      organizationName: organization.name,
      emailSent: emailResult.success,
      isExistingUser: !!existingUser
    });

  } catch (error) {
    console.error('Error inviting user:', error);
    return NextResponse.json(
      { error: 'Failed to invite user' },
      { status: 500 }
    );
  }
}
