import { NextResponse } from 'next/server';
import { authenticateUser, createSession, setSessionCookie } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    console.log('Login attempt for:', email);
    
    const user = await authenticateUser(email, password);
    console.log('Authenticate result:', user ? 'User found' : 'User not found');
    
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    
    const session = await createSession(user.id);
    console.log('Session created:', session.id);
    
    await setSessionCookie(session.id, session.expiresAt);
    console.log('Session cookie set');
    
    return NextResponse.json({ ok: true, user });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed', message: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}


