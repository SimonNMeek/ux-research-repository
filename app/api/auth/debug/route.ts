import { NextResponse } from 'next/server';
import { getSessionCookie } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const sessionId = await getSessionCookie();
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session_id');
    
    return NextResponse.json({
      sessionId,
      sessionCookie: sessionCookie ? {
        name: sessionCookie.name,
        value: sessionCookie.value,
        domain: sessionCookie.domain,
        path: sessionCookie.path,
        expires: sessionCookie.expires
      } : null,
      allCookies: cookieStore.getAll().map(c => ({
        name: c.name,
        value: c.value?.substring(0, 10) + '...' // Truncate for security
      }))
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
