import { NextRequest, NextResponse } from 'next/server';
import { getDbAdapter, getDbType } from '@/db/adapter';
import { hashPassword } from '@/lib/auth';
import { getInvitationByToken, markInvitationAsAccepted } from '@/lib/invitations';

export async function POST(request: NextRequest) {
  try {
    const { 
      firstName, 
      lastName, 
      email, 
      password,
      organizationName,
      organizationType,
      joinExisting,
      inviteCode,
      inviteToken
    } = await request.json();


    // Validation
    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Handle invitation token if provided
    let invitation = null;
    if (inviteToken) {
      invitation = await getInvitationByToken(inviteToken);
      if (!invitation) {
        return NextResponse.json(
          { error: 'Invalid or expired invitation' },
          { status: 400 }
        );
      }
      // Validate email matches invitation
      if (invitation.email.toLowerCase() !== email.toLowerCase()) {
        return NextResponse.json(
          { error: 'Email address does not match the invitation' },
          { status: 400 }
        );
      }
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Password validation (minimum 8 characters)
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    const adapter = getDbAdapter();
    const dbType = getDbType();

    // Check if user already exists
    let existingUser;
    if (dbType === 'postgres') {
      const result = await adapter.query('SELECT id FROM users WHERE email = $1', [email]);
      existingUser = result.rows[0];
    } else {
      const stmt = adapter.prepare('SELECT id FROM users WHERE email = ?');
      existingUser = stmt.get([email]);
    }

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password with bcrypt
    const passwordHash = hashPassword(password);
    const fullName = `${firstName} ${lastName}`.trim();

    // Insert new user with 'contributor' role by default
    let userId;
    if (dbType === 'postgres') {
      const result = await adapter.query(
        `INSERT INTO users (email, name, first_name, last_name, password_hash, system_role)
         VALUES ($1, $2, $3, $4, $5, 'contributor') RETURNING id`,
        [email, fullName, firstName, lastName, passwordHash]
      );
      userId = result.rows[0].id;
    } else {
      const stmt = adapter.prepare(
        `INSERT INTO users (email, name, first_name, last_name, password_hash, system_role)
         VALUES (?, ?, ?, ?, ?, 'contributor')`
      );
      const result = stmt.run([email, fullName, firstName, lastName, passwordHash]);
      userId = result.lastInsertRowid;
    }

    // Create organization for new users
    // This gives them their own isolated tenant space
    let orgSlug, orgName, organizationId;
    
    if (invitation) {
      // User is joining via invitation - use the invitation's organization
      organizationId = invitation.organization_id;
      
      // Get organization details
      if (dbType === 'postgres') {
        const orgResult = await adapter.query('SELECT name FROM organizations WHERE id = $1', [organizationId]);
        orgName = orgResult.rows[0].name;
      } else {
        const orgStmt = adapter.prepare('SELECT name FROM organizations WHERE id = ?');
        const orgResult = orgStmt.get([organizationId]);
        orgName = orgResult.name;
      }
    } else if (joinExisting && inviteCode) {
      // Handle joining existing organization (TODO: implement invite code validation)
      return NextResponse.json(
        { error: 'Joining existing organizations is not yet implemented' },
        { status: 501 }
      );
    } else {
      // Create new organization with user-provided name
      orgName = organizationName || `${firstName}'s Organization`;
      orgSlug = orgName.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      
      // Ensure slug is unique by appending user ID if needed
      orgSlug = `${orgSlug}-${userId}`;
    }
    
    // Create organization only if not joining via invitation
    if (!invitation) {
      if (dbType === 'postgres') {
        const orgResult = await adapter.query(
          `INSERT INTO organizations (slug, name, billing_email, plan) VALUES ($1, $2, $3, 'free') RETURNING id`,
          [orgSlug, orgName, email]
        );
        organizationId = orgResult.rows[0].id;
      } else {
        const orgStmt = adapter.prepare(`INSERT INTO organizations (slug, name, billing_email, plan) VALUES (?, ?, ?, 'free')`);
        const orgResult = orgStmt.run([orgSlug, orgName, email]);
        organizationId = orgResult.lastInsertRowid;
      }
    }

    // Grant user access to organization
    const userRole = invitation ? invitation.role : 'owner';
    const invitedBy = invitation ? invitation.invited_by : userId;
    
    if (dbType === 'postgres') {
      await adapter.query(
        `INSERT INTO user_organizations (user_id, organization_id, role, invited_by)
         VALUES ($1, $2, $3, $4)`,
        [userId, organizationId, userRole, invitedBy]
      );
    } else {
      const stmt = adapter.prepare(
        `INSERT INTO user_organizations (user_id, organization_id, role, invited_by)
         VALUES (?, ?, ?, ?)`
      );
      stmt.run([userId, organizationId, userRole, invitedBy]);
    }

    // Create a default workspace within the organization (only for new organizations)
    let workspaceId;
    if (!invitation) {
      // For new organizations, create a workspace
      const workspaceSlug = `${orgSlug}-workspace`;
      const workspaceName = `${orgName} Workspace`;
      
      if (dbType === 'postgres') {
        const workspaceResult = await adapter.query(
          `INSERT INTO workspaces (slug, name, organization_id, metadata) VALUES ($1, $2, $3, $4) RETURNING id`,
          [workspaceSlug, workspaceName, organizationId, JSON.stringify({ description: 'Your first workspace' })]
        );
        workspaceId = workspaceResult.rows[0].id;
      } else {
        const workspaceStmt = adapter.prepare(`INSERT INTO workspaces (slug, name, organization_id, metadata) VALUES (?, ?, ?, ?)`);
        const workspaceResult = workspaceStmt.run([workspaceSlug, workspaceName, organizationId, JSON.stringify({ description: 'Your first workspace' })]);
        workspaceId = workspaceResult.lastInsertRowid;
      }
    } else {
      // For invitations, find an existing workspace in the organization
      if (dbType === 'postgres') {
        const workspaceResult = await adapter.query(
          'SELECT id FROM workspaces WHERE organization_id = $1 LIMIT 1',
          [organizationId]
        );
        workspaceId = workspaceResult.rows[0]?.id;
      } else {
        const workspaceStmt = adapter.prepare('SELECT id FROM workspaces WHERE organization_id = ? LIMIT 1');
        const workspaceResult = workspaceStmt.get([organizationId]);
        workspaceId = workspaceResult?.id;
      }
    }

    // Grant user access to the workspace with appropriate role
    const workspaceRole = invitation ? invitation.role : 'owner'; // Use invitation role if available, otherwise owner for new org creators
    const workspaceGrantedBy = invitation ? invitation.invited_by : userId; // Use inviter as granter if invited, otherwise self
    
    if (dbType === 'postgres') {
      await adapter.query(
        `INSERT INTO user_workspaces (user_id, workspace_id, role, granted_by)
         VALUES ($1, $2, $3, $4)`,
        [userId, workspaceId, workspaceRole, workspaceGrantedBy]
      );
    } else {
      const stmt = adapter.prepare(
        `INSERT INTO user_workspaces (user_id, workspace_id, role, granted_by)
         VALUES (?, ?, ?, ?)`
      );
      stmt.run([userId, workspaceId, workspaceRole, workspaceGrantedBy]);
    }

    // Mark invitation as accepted if this was an invitation signup
    if (invitation) {
      await markInvitationAsAccepted(invitation.token);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Account created successfully! You can now sign in.',
        userId: userId,
        joinedViaInvitation: !!invitation
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    return NextResponse.json(
      { 
        error: 'An error occurred during signup. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

