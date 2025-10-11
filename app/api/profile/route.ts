import { NextResponse } from 'next/server';
import { getSessionCookie, validateSession } from '@/lib/auth';
import { getDb } from '@/db';

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

    const db = getDb();
    const stmt = db.prepare('UPDATE users SET name = ? WHERE id = ?');
    stmt.run(name.trim(), user.id);

    // Return updated user
    const updatedUser = db.prepare('SELECT id, email, name, is_active FROM users WHERE id = ?').get(user.id);
    
    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
