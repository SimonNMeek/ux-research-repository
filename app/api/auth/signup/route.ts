import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';

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

    // For demo purposes, we're storing plain text passwords
    // In production, use bcrypt or similar
    const fullName = `${firstName} ${lastName}`.trim();

    // Insert new user with 'contributor' role by default
    const result = db
      .prepare(
        `INSERT INTO users (email, name, first_name, last_name, password_hash, system_role)
         VALUES (?, ?, ?, ?, ?, 'contributor')`
      )
      .run(email, fullName, firstName, lastName, password);

    const userId = result.lastInsertRowid;

    // Get all workspaces and grant contributor access
    const workspaces = db
      .prepare('SELECT id FROM workspaces')
      .all() as Array<{ id: number }>;

    // Grant 'member' workspace role to new contributors
    const grantAccess = db.prepare(
      `INSERT INTO user_workspaces (user_id, workspace_id, role)
       VALUES (?, ?, 'member')`
    );

    for (const workspace of workspaces) {
      grantAccess.run(userId, workspace.id);
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

