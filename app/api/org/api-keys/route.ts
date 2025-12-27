import { NextRequest, NextResponse } from 'next/server';
import { getDbAdapter, getDbType } from '@/db/adapter';
import { getSessionCookie, validateSession } from '@/lib/auth';
import { 
  createOrganizationApiKey, 
  listOrganizationApiKeys, 
  revokeOrganizationApiKey, 
  deleteOrganizationApiKey 
} from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const sessionId = await getSessionCookie();
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const user = await validateSession(sessionId);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
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

    // List organization API keys
    const apiKeys = await listOrganizationApiKeys(organization.id);

    return NextResponse.json({ apiKeys, organization });

  } catch (error) {
    console.error('Error fetching organization API keys:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization API keys' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionId = await getSessionCookie();
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const user = await validateSession(sessionId);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { name, expiresAt } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
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
      return NextResponse.json({ error: 'Not authorized to create organization API keys' }, { status: 403 });
    }

    // Create organization API key
    const apiKeyResult = await createOrganizationApiKey(
      organization.id,
      name,
      expiresAt ? new Date(expiresAt) : undefined
    );

    return NextResponse.json({
      message: 'Organization API key created successfully',
      apiKey: apiKeyResult
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating organization API key:', error);
    return NextResponse.json(
      { error: 'Failed to create organization API key' },
      { status: 500 }
    );
  }
}
