import { NextResponse } from 'next/server';
import { destroySession, getSessionCookie, clearSessionCookie } from '@/lib/auth';

export async function POST() {
  const sessionId = await getSessionCookie();
  destroySession(sessionId);
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}


