import { NextResponse } from 'next/server';
import { authenticateUser, createSession, setSessionCookie } from '@/lib/auth';

export async function POST(request: Request) {
  const { email, password } = await request.json();
  const user = await authenticateUser(email, password);
  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }
  const session = await createSession(user.id);
  await setSessionCookie(session.id, session.expiresAt);
  return NextResponse.json({ ok: true, user });
}


