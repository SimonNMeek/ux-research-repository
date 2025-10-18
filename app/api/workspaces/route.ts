import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db/index';
import { getDbAdapter, getDbType } from '@/db/adapter';
import { getSessionCookie, validateSession } from '@/lib/auth';
import { canCreateWorkspace, getPermissionErrorMessage, PERMISSIONS } from '@/lib/permissions';

export async function GET() {
  try {
    // Get authenticated user
    const sessionId = await getSessionCookie();
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await validateSession(sessionId);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const adapter = getDbAdapter();
    const dbType = getDbType();
    
    // Super admins can see all workspaces with organization info
    if (user.system_role === 'super_admin') {
      let workspaces: any[];
      if (dbType === 'postgres') {
        const result = await adapter.query(`
          SELECT w.id, w.name, w.slug, w.created_at, o.id as organization_id, o.name as organization_name, o.slug as organization_slug
          FROM workspaces w
          INNER JOIN organizations o ON w.organization_id = o.id
          ORDER BY o.name, w.name
        `);
        workspaces = result.rows;
      } else {
        const db = getDb();
        workspaces = db.prepare(`
          SELECT w.id, w.name, w.slug, w.created_at, o.id as organization_id, o.name as organization_name, o.slug as organization_slug
          FROM workspaces w
          INNER JOIN organizations o ON w.organization_id = o.id
          ORDER BY o.name, w.name
        `).all();
      }

      return NextResponse.json({ workspaces });
    }
    
    // Regular users only see workspaces they have access to
    let workspaces: any[];
    if (dbType === 'postgres') {
      const result = await adapter.query(`
        SELECT w.id, w.name, w.slug, w.created_at, uw.role
        FROM workspaces w
        INNER JOIN user_workspaces uw ON w.id = uw.workspace_id
        WHERE uw.user_id = $1
        ORDER BY w.name
      `, [user.id]);
      workspaces = result.rows;
    } else {
      const db = getDb();
      workspaces = db.prepare(`
        SELECT w.id, w.name, w.slug, w.created_at, uw.role
        FROM workspaces w
        INNER JOIN user_workspaces uw ON w.id = uw.workspace_id
        WHERE uw.user_id = ?
        ORDER BY w.name
      `).all(user.id);
    }

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

    const user = await validateSession(sessionId);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Check permissions - allow system admins or organization owners/admins
    console.log('DEBUG: User for workspace creation:', { id: user.id, email: user.email, system_role: user.system_role });
    
    // System admins can always create workspaces
    const canCreateBySystemRole = canCreateWorkspace(user);
    
    if (!canCreateBySystemRole) {
      // Check if user is an organization owner/admin (permission will be verified later against the specific organization)
      console.log('DEBUG: User is not a system admin, will check organization permissions later');
    }

    const { name, slug, description, organizationId } = await request.json();

    if (!name || !slug || !organizationId) {
      return NextResponse.json(
        { error: 'Name, slug, and organizationId are required' },
        { status: 400 }
      );
    }

    const adapter = getDbAdapter();
    const dbType = getDbType();

    // Verify user has access to organization and can create workspaces
    let orgAccess: { role: string } | undefined;
    if (dbType === 'postgres') {
      const result = await adapter.query(`SELECT role FROM user_organizations WHERE user_id = $1 AND organization_id = $2`, [user.id, organizationId]);
      orgAccess = result.rows[0] as { role: string } | undefined;
    } else {
      const db = getDb();
      orgAccess = db.prepare(`SELECT role FROM user_organizations WHERE user_id = ? AND organization_id = ?`).get(user.id, organizationId) as { role: string } | undefined;
    }

    if (!orgAccess && user.system_role !== 'super_admin') {
      return NextResponse.json(
        { error: 'You do not have access to this organization' },
        { status: 403 }
      );
    }

    // Check if user can create workspaces (system admin OR organization owner/admin)
    const canCreateWorkspaceInOrg = user.system_role === 'super_admin' || 
                                   orgAccess?.role === 'owner' || 
                                   orgAccess?.role === 'admin';
    
    if (!canCreateWorkspaceInOrg) {
      return NextResponse.json(
        { error: 'Only organization owners and admins can create workspaces' },
        { status: 403 }
      );
    }

    // Check organization limits
    let org: any;
    if (dbType === 'postgres') {
      const result = await adapter.query(`SELECT * FROM organizations WHERE id = $1`, [organizationId]);
      org = result.rows[0];
    } else {
      const db = getDb();
      org = db.prepare(`SELECT * FROM organizations WHERE id = ?`).get(organizationId);
    }

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    let workspaceCount: { count: number };
    if (dbType === 'postgres') {
      const result = await adapter.query(`SELECT COUNT(*) as count FROM workspaces WHERE organization_id = $1`, [organizationId]);
      workspaceCount = result.rows[0] as { count: number };
    } else {
      const db = getDb();
      workspaceCount = db.prepare(`SELECT COUNT(*) as count FROM workspaces WHERE organization_id = ?`).get(organizationId) as { count: number };
    }

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
    let existing: any;
    if (dbType === 'postgres') {
      const result = await adapter.query(`SELECT id FROM workspaces WHERE slug = $1 AND organization_id = $2`, [slug, organizationId]);
      existing = result.rows[0];
    } else {
      const db = getDb();
      existing = db.prepare(`SELECT id FROM workspaces WHERE slug = ? AND organization_id = ?`).get(slug, organizationId);
    }

    if (existing) {
      return NextResponse.json(
        { error: 'Slug already exists in this organization' },
        { status: 409 }
      );
    }

    // Create workspace (store description in metadata JSON)
    let workspaceId: number;
    if (dbType === 'postgres') {
      const result = await adapter.query(
        `INSERT INTO workspaces (slug, name, organization_id, metadata) VALUES ($1, $2, $3, $4) RETURNING id`,
        [slug, name, organizationId, JSON.stringify({ description: description || '' })]
      );
      workspaceId = result.rows[0].id;
    } else {
      const db = getDb();
      const result = db.prepare(
        `INSERT INTO workspaces (slug, name, organization_id, metadata) VALUES (?, ?, ?, ?)`
      ).run(slug, name, organizationId, JSON.stringify({ description: description || '' }));
      workspaceId = result.lastInsertRowid;
    }

    // CRITICAL: Auto-grant creator as owner in user_workspaces
    if (dbType === 'postgres') {
      await adapter.query(
        `INSERT INTO user_workspaces (user_id, workspace_id, role, granted_by) VALUES ($1, $2, 'owner', $3)`,
        [user.id, workspaceId, user.id]
      );
    } else {
      const db = getDb();
      db.prepare(
        `INSERT INTO user_workspaces (user_id, workspace_id, role, granted_by) VALUES (?, ?, 'owner', ?)`
      ).run(user.id, workspaceId, user.id);
    }

    // AUTO-GRANT: Give all organization members access to the new workspace
    // Get all organization members
    let orgMembers: { user_id: number; role: string }[];
    if (dbType === 'postgres') {
      const membersResult = await adapter.query(
        `SELECT user_id, role FROM user_organizations WHERE organization_id = $1 AND user_id != $2`,
        [organizationId, user.id]
      );
      orgMembers = membersResult.rows;
    } else {
      const db = getDb();
      orgMembers = db.prepare(
        `SELECT user_id, role FROM user_organizations WHERE organization_id = ? AND user_id != ?`
      ).all(organizationId, user.id);
    }

    // Grant workspace access to all organization members
    // Owners get admin role, admins get admin role, members get member role
    for (const member of orgMembers) {
      let workspaceRole: string;
      if (member.role === 'owner') {
        workspaceRole = 'admin'; // Organization owners get admin role in workspace
      } else if (member.role === 'admin') {
        workspaceRole = 'admin'; // Organization admins get admin role in workspace
      } else {
        workspaceRole = 'member'; // Organization members get member role in workspace
      }

      if (dbType === 'postgres') {
        await adapter.query(
          `INSERT INTO user_workspaces (user_id, workspace_id, role, granted_by) VALUES ($1, $2, $3, $4)`,
          [member.user_id, workspaceId, workspaceRole, user.id]
        );
      } else {
        const db = getDb();
        db.prepare(
          `INSERT INTO user_workspaces (user_id, workspace_id, role, granted_by) VALUES (?, ?, ?, ?)`
        ).run(member.user_id, workspaceId, workspaceRole, user.id);
      }
    }

    let newWorkspace: any;
    if (dbType === 'postgres') {
      const result = await adapter.query(`SELECT id, name, slug, created_at FROM workspaces WHERE id = $1`, [workspaceId]);
      newWorkspace = result.rows[0];
    } else {
      const db = getDb();
      newWorkspace = db.prepare(`SELECT id, name, slug, created_at FROM workspaces WHERE id = ?`).get(workspaceId);
    }

    return NextResponse.json({ workspace: newWorkspace }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating workspace:', error);
    return NextResponse.json(
      { error: 'Failed to create workspace' },
      { status: 500 }
    );
  }
}
