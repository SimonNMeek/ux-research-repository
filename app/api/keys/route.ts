import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie, validateSession } from '@/lib/auth';
import { createApiKey, listApiKeys, revokeApiKey, deleteApiKey } from '@/lib/api-auth';

export async function GET() {
  try {
    const sessionId = await getSessionCookie();
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateSession(sessionId);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const keys = await listApiKeys(user.id);
    return NextResponse.json({ keys });
  } catch (error: any) {
    console.error('Error listing API keys:', error);
    return NextResponse.json({ error: 'Failed to list API keys' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionId = await getSessionCookie();
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateSession(sessionId);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { name, expires_at } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const expiresAt = expires_at ? new Date(expires_at) : undefined;
    const { key, prefix, id } = await createApiKey(user.id, name.trim(), expiresAt);

    return NextResponse.json(
      {
        message: 'API key created successfully. Save it now - you won\'t be able to see it again!',
        key, // Only shown once!
        id,
        prefix,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating API key:', error);
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sessionId = await getSessionCookie();
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateSession(sessionId);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('id');

    if (!keyId) {
      return NextResponse.json({ error: 'Key ID is required' }, { status: 400 });
    }

    const success = await deleteApiKey(parseInt(keyId), user.id);

    if (!success) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'API key deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting API key:', error);
    return NextResponse.json({ error: 'Failed to delete API key' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const sessionId = await getSessionCookie();
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateSession(sessionId);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { id, action } = await request.json();

    if (!id || !action) {
      return NextResponse.json({ error: 'ID and action are required' }, { status: 400 });
    }

    if (action === 'revoke') {
      const success = await revokeApiKey(id, user.id);
      if (!success) {
        return NextResponse.json({ error: 'API key not found' }, { status: 404 });
      }
      return NextResponse.json({ message: 'API key revoked successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error updating API key:', error);
    return NextResponse.json({ error: 'Failed to update API key' }, { status: 500 });
  }
}

