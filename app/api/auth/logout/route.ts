import { NextResponse } from 'next/server';
import { destroySession, getSessionCookie, clearSessionCookie } from '@/lib/auth';

export async function POST() {
  const sessionId = getSessionCookie();
  destroySession(sessionId);
  clearSessionCookie();
  return NextResponse.json({ ok: true });
}


