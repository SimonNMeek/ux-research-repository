import { NextRequest, NextResponse } from 'next/server';
import { getDbAdapter, getDbType } from '@/db/adapter';
import { getSessionCookie, validateSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const sessionId = await getSessionCookie();
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateSession(sessionId);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Check if user has admin privileges
    const adapter = getDbAdapter();
    const dbType = getDbType();
    
    let currentUser;
    if (dbType === 'postgres') {
      const result = await adapter.query('SELECT system_role FROM users WHERE id = $1', [user.id]);
      currentUser = result.rows[0];
    } else {
      const stmt = adapter.prepare('SELECT system_role FROM users WHERE id = ?');
      currentUser = stmt.get([user.id]);
    }

    if (!currentUser || (currentUser.system_role !== 'super_admin' && currentUser.system_role !== 'admin')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get all users
    let users;
    if (dbType === 'postgres') {
      const result = await adapter.query(
        `SELECT 
          id, email, name, first_name, last_name, 
          system_role, is_active, created_at, last_login_at
         FROM users
         ORDER BY created_at DESC`
      );
      users = result.rows;
    } else {
      const stmt = adapter.prepare(
        `SELECT 
          id, email, name, first_name, last_name, 
          system_role, is_active, created_at, last_login_at
         FROM users
         ORDER BY created_at DESC`
      );
      users = stmt.all();
    }

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Authenticate user
    const sessionId = await getSessionCookie();
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateSession(sessionId);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Check if user is super_admin (only super_admins can change roles)
    const adapter = getDbAdapter();
    const dbType = getDbType();
    
    let currentUser;
    if (dbType === 'postgres') {
      const result = await adapter.query('SELECT system_role FROM users WHERE id = $1', [user.id]);
      currentUser = result.rows[0];
    } else {
      const stmt = adapter.prepare('SELECT system_role FROM users WHERE id = ?');
      currentUser = stmt.get([user.id]);
    }

    if (!currentUser || currentUser.system_role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only Super Admins can change user roles' },
        { status: 403 }
      );
    }

    const { userId, system_role } = await request.json();

    // Validation
    if (!userId || !system_role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const validRoles = ['super_admin', 'admin', 'contributor', 'viewer'];
    if (!validRoles.includes(system_role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Prevent users from changing their own role
    if (userId === user.id) {
      return NextResponse.json(
        { error: 'You cannot change your own role' },
        { status: 400 }
      );
    }

    // Update user role
    if (dbType === 'postgres') {
      await adapter.query(
        `UPDATE users 
         SET system_role = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [system_role, userId]
      );
    } else {
      const stmt = adapter.prepare(
        `UPDATE users 
         SET system_role = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      );
      stmt.run([system_role, userId]);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'User role updated successfully' 
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json(
      { error: 'Failed to update user role' },
      { status: 500 }
    );
  }
}

