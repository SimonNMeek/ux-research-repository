import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/db/postgres';
import { getSessionCookie, validateSession } from '@/lib/auth';
import { canCreateWorkspace, getPermissionErrorMessage, PERMISSIONS } from '@/lib/permissions';

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

    if (user.system_role === 'super_admin') {
      const result = await query(
        `SELECT w.id, w.name, w.slug, w.created_at,
                o.id AS organization_id, o.name AS organization_name, o.slug AS organization_slug
           FROM workspaces w
           INNER JOIN organizations o ON w.organization_id = o.id
          ORDER BY o.name, w.name`
      );
      return NextResponse.json({ workspaces: result.rows });
    }

    const result = await query(
      `SELECT w.id, w.name, w.slug, w.created_at, uw.role
         FROM workspaces w
         INNER JOIN user_workspaces uw ON w.id = uw.workspace_id
        WHERE uw.user_id = $1
        ORDER BY w.name`,
      [user.id]
    );

    return NextResponse.json({ workspaces: result.rows });
  } catch (error: any) {
    console.error('Error fetching workspaces:', error);
    return NextResponse.json({ error: 'Failed to fetch workspaces' }, { status: 500 });
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

    const canCreateBySystemRole = canCreateWorkspace(user);
    if (!canCreateBySystemRole) {
      console.log('DEBUG: User is not a system admin, will check organization permissions later');
    }

    const { name, slug, description, organizationId } = await request.json();

    if (!name || !slug || !organizationId) {
      return NextResponse.json(
        { error: 'Name, slug, and organizationId are required' },
        { status: 400 }
      );
    }

    const orgAccessResult = await query<{ role: string }>(
      `SELECT role FROM user_organizations WHERE user_id = $1 AND organization_id = $2`,
      [user.id, organizationId]
    );
    const orgAccess = orgAccessResult.rows[0];

    if (!orgAccess && user.system_role !== 'super_admin') {
      return NextResponse.json(
        { error: 'You do not have access to this organization' },
        { status: 403 }
      );
    }

    const canCreateWorkspaceInOrg =
      user.system_role === 'super_admin' ||
      orgAccess?.role === 'owner' ||
      orgAccess?.role === 'admin';

    if (!canCreateWorkspaceInOrg) {
      return NextResponse.json(
        { error: 'Only organization owners and admins can create workspaces' },
        { status: 403 }
      );
    }

    const orgResult = await query(`SELECT * FROM organizations WHERE id = $1`, [organizationId]);
    const org = orgResult.rows[0];

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const workspaceCountResult = await query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM workspaces WHERE organization_id = $1`,
      [organizationId]
    );
    const workspaceCount = parseInt(workspaceCountResult.rows[0]?.count ?? '0', 10);

    if (workspaceCount >= (org.max_workspaces ?? 0)) {
      return NextResponse.json(
        { error: `Organization has reached workspace limit (${org.max_workspaces}). Upgrade your plan to create more workspaces.` },
        { status: 403 }
      );
    }

    const slugPattern = /^[a-z0-9-]+$/;
    if (!slugPattern.test(slug)) {
      return NextResponse.json(
        { error: 'Slug must contain only lowercase letters, numbers, and hyphens' },
        { status: 400 }
      );
    }

    const existingResult = await query(
      `SELECT id FROM workspaces WHERE slug = $1 AND organization_id = $2`,
      [slug, organizationId]
    );
    if (existingResult.rows.length > 0) {
      return NextResponse.json(
        { error: 'Slug already exists in this organization' },
        { status: 409 }
      );
    }

    const newWorkspaceResult = await query(
      `INSERT INTO workspaces (slug, name, organization_id, metadata)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, slug, created_at`,
      [slug, name, organizationId, JSON.stringify({ description: description || '' })]
    );

    const newWorkspace = newWorkspaceResult.rows[0];

    await query(
      `INSERT INTO user_workspaces (user_id, workspace_id, role, granted_by)
       VALUES ($1, $2, 'owner', $3)`,
      [user.id, newWorkspace.id, user.id]
    );

    const membersResult = await query<{ user_id: number; role: string }>(
      `SELECT user_id, role FROM user_organizations WHERE organization_id = $1 AND user_id != $2`,
      [organizationId, user.id]
    );

    for (const member of membersResult.rows) {
      const workspaceRole = member.role === 'member' ? 'member' : 'admin';
      await query(
        `INSERT INTO user_workspaces (user_id, workspace_id, role, granted_by)
         VALUES ($1, $2, $3, $4)`,
        [member.user_id, newWorkspace.id, workspaceRole, user.id]
      );
    }

    return NextResponse.json({ workspace: newWorkspace }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating workspace:', error);
    return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 });
  }
}
