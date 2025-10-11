import { NextResponse } from 'next/server';
import { getSessionCookie, validateSession } from '@/lib/auth';

export async function GET() {
  const sessionId = await getSessionCookie();
  const user = await validateSession(sessionId);
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  return NextResponse.json({ user });
}


