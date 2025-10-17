import { NextRequest, NextResponse } from 'next/server';
import { getDbAdapter, getDbType } from '@/db/adapter';
import { hashPassword } from '@/lib/auth';

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
      inviteCode
    } = await request.json();


    // Validation
    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
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
    let orgSlug, orgName;
    
    if (joinExisting && inviteCode) {
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
    
    let organizationId;
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

    // Grant user as owner of their organization
    if (dbType === 'postgres') {
      await adapter.query(
        `INSERT INTO user_organizations (user_id, organization_id, role, invited_by)
         VALUES ($1, $2, 'owner', $3)`,
        [userId, organizationId, userId]
      );
    } else {
      const stmt = adapter.prepare(
        `INSERT INTO user_organizations (user_id, organization_id, role, invited_by)
         VALUES (?, ?, 'owner', ?)`
      );
      stmt.run([userId, organizationId, userId]);
    }

    // Create a default workspace within the organization
    const workspaceSlug = `${orgSlug}-workspace`;
    const workspaceName = `${orgName} Workspace`;
    
    let workspaceId;
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

    // Grant user access to the workspace
    if (dbType === 'postgres') {
      await adapter.query(
        `INSERT INTO user_workspaces (user_id, workspace_id, role, granted_by)
         VALUES ($1, $2, 'owner', $3)`,
        [userId, workspaceId, userId]
      );
    } else {
      const stmt = adapter.prepare(
        `INSERT INTO user_workspaces (user_id, workspace_id, role, granted_by)
         VALUES (?, ?, 'owner', ?)`
      );
      stmt.run([userId, workspaceId, userId]);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Account created successfully! You can now sign in.',
        userId: userId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'An error occurred during signup. Please try again.' },
      { status: 500 }
    );
  }
}

