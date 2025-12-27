import { NextRequest, NextResponse } from 'next/server';
import { getDbAdapter, getDbType } from '@/db/adapter';
import { getSessionCookie, validateSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
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

    // Only allow Robert to fix his own access (or super admin)
    if (user.email !== 'rob@sugar.com' && user.system_role !== 'super_admin') {
      return NextResponse.json({ error: 'Not authorized to fix this access' }, { status: 403 });
    }

    const adapter = getDbAdapter();
    const dbType = getDbType();

    // Get Robert's organization
    let userOrg;
    if (dbType === 'postgres') {
      const orgResult = await adapter.query(
        `SELECT o.id, o.name, o.slug, uo.role as user_role
         FROM organizations o
         INNER JOIN user_organizations uo ON o.id = uo.organization_id
         WHERE uo.user_id = $1`,
        [user.id]
      );
      userOrg = orgResult.rows[0];
    } else {
      const orgStmt = adapter.prepare(
        `SELECT o.id, o.name, o.slug, uo.role as user_role
         FROM organizations o
         INNER JOIN user_organizations uo ON o.id = uo.organization_id
         WHERE uo.user_id = ?`
      );
      userOrg = orgStmt.get([user.id]);
    }

    if (!userOrg) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Get all workspaces in the organization
    let orgWorkspaces;
    if (dbType === 'postgres') {
      const workspaceResult = await adapter.query(
        `SELECT id, name, slug, organization_id
         FROM workspaces
         WHERE organization_id = $1`,
        [userOrg.id]
      );
      orgWorkspaces = workspaceResult.rows;
    } else {
      const workspaceStmt = adapter.prepare(
        `SELECT id, name, slug, organization_id
         FROM workspaces
         WHERE organization_id = ?`
      );
      orgWorkspaces = workspaceStmt.all([userOrg.id]);
    }

    if (!orgWorkspaces || orgWorkspaces.length === 0) {
      return NextResponse.json({ error: 'No workspaces found in organization' }, { status: 404 });
    }

    // Grant Robert access to all workspaces in his organization as owner
    const results = [];
    for (const workspace of orgWorkspaces) {
      try {
        if (dbType === 'postgres') {
          await adapter.query(
            `INSERT INTO user_workspaces (user_id, workspace_id, role, granted_by)
             VALUES ($1, $2, 'owner', $1)
             ON CONFLICT (user_id, workspace_id) DO NOTHING`,
            [user.id, workspace.id]
          );
        } else {
          const stmt = adapter.prepare(
            `INSERT OR IGNORE INTO user_workspaces (user_id, workspace_id, role, granted_by)
             VALUES (?, ?, 'owner', ?)`
          );
          stmt.run([user.id, workspace.id, user.id]);
        }
        
        results.push({
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          action: 'granted'
        });
      } catch (error: any) {
        results.push({
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          action: 'failed',
          error: error.message
        });
      }
    }

    return NextResponse.json({
      message: 'Workspace access fixed for Robert',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      organization: userOrg,
      workspacesFixed: results
    });

  } catch (error: any) {
    console.error('Fix Robert access error:', error);
    return NextResponse.json(
      { error: 'Failed to fix Robert access', details: error.message },
      { status: 500 }
    );
  }
}
