import { NextRequest, NextResponse } from 'next/server';
import { getDbAdapter, getDbType } from '@/db/adapter';
import { getSessionCookie, validateSession } from '@/lib/auth';
import { revokeOrganizationApiKey, deleteOrganizationApiKey } from '@/lib/api-auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  try {
    const sessionId = await getSessionCookie();
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const user = await validateSession(sessionId);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { keyId } = await params;
    const { action } = await request.json();

    if (!['revoke', 'delete'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be "revoke" or "delete"' }, { status: 400 });
    }

    const adapter = getDbAdapter();
    const dbType = getDbType();

    // Check if the user is an owner or admin of an organization
    let organization;
    if (dbType === 'postgres') {
      const result = await adapter.query(
        `SELECT o.id, o.name FROM organizations o
         INNER JOIN user_organizations uo ON o.id = uo.organization_id
         WHERE uo.user_id = $1 AND (uo.role = 'owner' OR uo.role = 'admin')
         LIMIT 1`,
        [user.id]
      );
      organization = result.rows[0];
    } else {
      const stmt = adapter.prepare(
        `SELECT o.id, o.name FROM organizations o
         INNER JOIN user_organizations uo ON o.id = uo.organization_id
         WHERE uo.user_id = ? AND (uo.role = 'owner' OR uo.role = 'admin')
         LIMIT 1`
      );
      organization = stmt.get([user.id]);
    }

    if (!organization) {
      return NextResponse.json({ error: 'Not authorized to manage organization API keys' }, { status: 403 });
    }

    let success: boolean;
    if (action === 'revoke') {
      success = await revokeOrganizationApiKey(parseInt(keyId), organization.id);
    } else {
      success = await deleteOrganizationApiKey(parseInt(keyId), organization.id);
    }

    if (!success) {
      return NextResponse.json({ error: 'API key not found or operation failed' }, { status: 404 });
    }

    return NextResponse.json({
      message: `API key ${action === 'revoke' ? 'revoked' : 'deleted'} successfully`
    });

  } catch (error) {
    console.error('Error managing organization API key:', error);
    return NextResponse.json(
      { error: 'Failed to manage organization API key' },
      { status: 500 }
    );
  }
}
