import { NextRequest, NextResponse } from 'next/server';
import { getDbAdapter, getDbType } from '@/db/adapter';
import { getSessionCookie, validateSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
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

    // Get user's organization info
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

    // Get all workspaces in the organization
    let orgWorkspaces;
    if (userOrg) {
      if (dbType === 'postgres') {
        const workspaceResult = await adapter.query(
          `SELECT id, name, slug, organization_id, created_at
           FROM workspaces
           WHERE organization_id = $1`,
          [userOrg.id]
        );
        orgWorkspaces = workspaceResult.rows;
      } else {
        const workspaceStmt = adapter.prepare(
          `SELECT id, name, slug, organization_id, created_at
           FROM workspaces
           WHERE organization_id = ?`
        );
        orgWorkspaces = workspaceStmt.all([userOrg.id]);
      }
    }

    // Get user's workspace access
    let userWorkspaceAccess;
    if (dbType === 'postgres') {
      const accessResult = await adapter.query(
        `SELECT uw.workspace_id, uw.role, uw.granted_by, w.name as workspace_name, w.slug as workspace_slug
         FROM user_workspaces uw
         INNER JOIN workspaces w ON uw.workspace_id = w.id
         WHERE uw.user_id = $1`,
        [user.id]
      );
      userWorkspaceAccess = accessResult.rows;
    } else {
      const accessStmt = adapter.prepare(
        `SELECT uw.workspace_id, uw.role, uw.granted_by, w.name as workspace_name, w.slug as workspace_slug
         FROM user_workspaces uw
         INNER JOIN workspaces w ON uw.workspace_id = w.id
         WHERE uw.user_id = ?`
      );
      userWorkspaceAccess = accessStmt.all([user.id]);
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      organization: userOrg,
      organizationWorkspaces: orgWorkspaces || [],
      userWorkspaceAccess: userWorkspaceAccess || [],
      debug: {
        userOrgExists: !!userOrg,
        orgWorkspacesCount: orgWorkspaces?.length || 0,
        userAccessCount: userWorkspaceAccess?.length || 0
      }
    });

  } catch (error: any) {
    console.error('Debug workspace access error:', error);
    return NextResponse.json(
      { error: 'Failed to debug workspace access', details: error.message },
      { status: 500 }
    );
  }
}
