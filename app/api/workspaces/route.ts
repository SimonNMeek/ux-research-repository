import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db/index';
import { getSessionCookie, validateSession } from '@/lib/auth';
import { canCreateWorkspace, getPermissionErrorMessage, PERMISSIONS } from '@/lib/permissions';

export async function GET() {
  try {
    // Get authenticated user
    const sessionId = await getSessionCookie();
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = validateSession(sessionId);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const db = getDb();
    
    // Super admins can see all workspaces
    if (user.system_role === 'super_admin') {
      const workspaces = db
        .prepare(`
          SELECT id, name, slug, created_at
          FROM workspaces
          ORDER BY name
        `)
        .all();

      return NextResponse.json({ workspaces });
    }
    
    // Regular users only see workspaces they have access to
    const workspaces = db
      .prepare(`
        SELECT w.id, w.name, w.slug, w.created_at, uw.role
        FROM workspaces w
        INNER JOIN user_workspaces uw ON w.id = uw.workspace_id
        WHERE uw.user_id = ?
        ORDER BY w.name
      `)
      .all(user.id);

    return NextResponse.json({ workspaces });
  } catch (error: any) {
    console.error('Error fetching workspaces:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workspaces' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const sessionId = await getSessionCookie();
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = validateSession(sessionId);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Check permissions
    if (!canCreateWorkspace(user)) {
      return NextResponse.json(
        { error: getPermissionErrorMessage(PERMISSIONS.CREATE_WORKSPACE) },
        { status: 403 }
      );
    }

    const { name, slug, description, organizationId } = await request.json();

    if (!name || !slug || !organizationId) {
      return NextResponse.json(
        { error: 'Name, slug, and organizationId are required' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Verify user has access to organization
    const orgAccess = db
      .prepare(`SELECT role FROM user_organizations WHERE user_id = ? AND organization_id = ?`)
      .get(user.id, organizationId) as { role: string } | undefined;

    if (!orgAccess && user.system_role !== 'super_admin') {
      return NextResponse.json(
        { error: 'You do not have access to this organization' },
        { status: 403 }
      );
    }

    // Check organization limits
    const org = db
      .prepare(`SELECT * FROM organizations WHERE id = ?`)
      .get(organizationId) as any;

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const workspaceCount = db
      .prepare(`SELECT COUNT(*) as count FROM workspaces WHERE organization_id = ?`)
      .get(organizationId) as { count: number };

    if (workspaceCount.count >= org.max_workspaces) {
      return NextResponse.json(
        { error: `Organization has reached workspace limit (${org.max_workspaces}). Upgrade your plan to create more workspaces.` },
        { status: 403 }
      );
    }

    // Validate slug format (alphanumeric + hyphens only)
    const slugPattern = /^[a-z0-9-]+$/;
    if (!slugPattern.test(slug)) {
      return NextResponse.json(
        { error: 'Slug must contain only lowercase letters, numbers, and hyphens' },
        { status: 400 }
      );
    }

    // Check if slug already exists within the organization
    const existing = db
      .prepare(`SELECT id FROM workspaces WHERE slug = ? AND organization_id = ?`)
      .get(slug, organizationId);

    if (existing) {
      return NextResponse.json(
        { error: 'Slug already exists in this organization' },
        { status: 409 }
      );
    }

    // Create workspace (store description in metadata JSON)
    const result = db.prepare(
      `INSERT INTO workspaces (slug, name, organization_id, metadata) VALUES (?, ?, ?, ?)`
    ).run(slug, name, organizationId, JSON.stringify({ description: description || '' }));

    const workspaceId = result.lastInsertRowid;

    // CRITICAL: Auto-grant creator as owner in user_workspaces
    db.prepare(
      `INSERT INTO user_workspaces (user_id, workspace_id, role, granted_by)
       VALUES (?, ?, 'owner', ?)`
    ).run(user.id, workspaceId, user.id);

    const newWorkspace = db
      .prepare(`SELECT id, name, slug, created_at FROM workspaces WHERE id = ?`)
      .get(workspaceId);

    return NextResponse.json({ workspace: newWorkspace }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating workspace:', error);
    return NextResponse.json(
      { error: 'Failed to create workspace' },
      { status: 500 }
    );
  }
}
