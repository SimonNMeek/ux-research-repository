import { NextRequest, NextResponse } from 'next/server';
import { getDbAdapter, getDbType } from '@/db/adapter';
import { validateSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Validate session and check for SuperAdmin access
    const sessionId = request.cookies.get('session_id')?.value;
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateSession(sessionId);
    if (!user || user.system_role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = getDbAdapter();
    const dbType = getDbType();

    // Get all organizations
    const organizationsQuery = dbType === 'postgres'
      ? `SELECT id, name, slug FROM organizations ORDER BY name`
      : `SELECT id, name, slug FROM organizations ORDER BY name`;

    const result = await db.query(organizationsQuery);
    const organizations = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      slug: row.slug
    }));

    return NextResponse.json({ organizations });

  } catch (error) {
    console.error('Organizations API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
