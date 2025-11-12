import { NextRequest, NextResponse } from 'next/server';
import { resetPasswordWithToken } from '@/lib/password-reset';

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Reset token is required' }, { status: 400 });
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    await resetPasswordWithToken(token, password);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Reset password error:', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Unable to reset password. Please request a new link.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

