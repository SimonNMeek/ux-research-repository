import { NextResponse } from 'next/server';
import { getSessionCookie, validateSession } from '@/lib/auth';
import { getDbAdapter, getDbType } from '@/db/adapter';

export async function PUT(request: Request) {
  try {
    const sessionId = await getSessionCookie();
    const user = await validateSession(sessionId);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const { name } = await request.json();
    
    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const adapter = getDbAdapter();
    const dbType = getDbType();

    // Update user name
    if (dbType === 'postgres') {
      await adapter.query('UPDATE users SET name = $1 WHERE id = $2', [name.trim(), user.id]);
    } else {
      const stmt = adapter.prepare('UPDATE users SET name = ? WHERE id = ?');
      stmt.run(name.trim(), user.id);
    }

    // Return updated user
    let updatedUser;
    if (dbType === 'postgres') {
      const result = await adapter.query('SELECT id, email, name, is_active FROM users WHERE id = $1', [user.id]);
      updatedUser = result.rows[0];
    } else {
      const stmt = adapter.prepare('SELECT id, email, name, is_active FROM users WHERE id = ?');
      updatedUser = stmt.get(user.id);
    }
    
    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
