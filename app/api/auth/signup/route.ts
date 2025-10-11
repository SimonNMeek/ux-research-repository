import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { hashPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { firstName, lastName, email, password } = await request.json();

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

    const db = getDb();

    // Check if user already exists
    const existingUser = db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(email);

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
    const result = db
      .prepare(
        `INSERT INTO users (email, name, first_name, last_name, password_hash, system_role)
         VALUES (?, ?, ?, ?, ?, 'contributor')`
      )
      .run(email, fullName, firstName, lastName, passwordHash);

    const userId = result.lastInsertRowid;

    // Create a default organization for new users
    // This gives them their own isolated tenant space
    const orgSlug = `${email.split('@')[0]}-${userId}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const orgName = `${firstName}'s Organization`;
    
    const orgResult = db
      .prepare(`INSERT INTO organizations (slug, name, billing_email, plan) VALUES (?, ?, ?, 'free')`)
      .run(orgSlug, orgName, email);
    
    const organizationId = orgResult.lastInsertRowid;

    // Grant user as owner of their organization
    db.prepare(
      `INSERT INTO user_organizations (user_id, organization_id, role, invited_by)
       VALUES (?, ?, 'owner', ?)`
    ).run(userId, organizationId, userId);

    // Create a default workspace within the organization
    const workspaceResult = db
      .prepare(`INSERT INTO workspaces (slug, name, organization_id, metadata) VALUES (?, ?, ?, ?)`)
      .run('my-workspace', 'My Workspace', organizationId, JSON.stringify({ description: 'Your first workspace' }));
    
    const workspaceId = workspaceResult.lastInsertRowid;

    // Grant user access to the workspace
    db.prepare(
      `INSERT INTO user_workspaces (user_id, workspace_id, role, granted_by)
       VALUES (?, ?, 'owner', ?)`
    ).run(userId, workspaceId, userId);

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

