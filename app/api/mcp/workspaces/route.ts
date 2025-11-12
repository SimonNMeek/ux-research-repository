import { NextRequest, NextResponse } from 'next/server';
import { withMcpAuth, McpContext, trackMcpUsage } from '@/lib/mcp-middleware';
import { query } from '@/db/postgres';

const handler = async (context: McpContext, request: NextRequest) => {
  const { user, organization } = context;

  await trackMcpUsage(user, '/api/mcp/workspaces');

  try {
    // Super admins see all workspaces
    if (user.system_role === 'super_admin') {
      const result = await query(
        `SELECT w.id, w.slug, w.name, w.created_at, o.name as organization_name
         FROM workspaces w
         LEFT JOIN organizations o ON w.organization_id = o.id
         ORDER BY w.name`
      );
      return NextResponse.json({ workspaces: result.rows });
    }

    if (user.scope_type === 'organization') {
      if (!user.organization_id) {
        return NextResponse.json({ workspaces: [] });
      }

      const result = await query(
        `SELECT w.id, w.slug, w.name, w.created_at, o.name as organization_name
         FROM workspaces w
         LEFT JOIN organizations o ON w.organization_id = o.id
         WHERE w.organization_id = $1
         ORDER BY w.name`,
        [user.organization_id]
      );
      return NextResponse.json({ workspaces: result.rows });
    }

    const result = await query(
      `SELECT w.id, w.slug, w.name, w.created_at, o.name as organization_name, uw.role
         FROM workspaces w
         INNER JOIN user_workspaces uw ON w.id = uw.workspace_id
         LEFT JOIN organizations o ON w.organization_id = o.id
        WHERE uw.user_id = $1
        ORDER BY w.name`,
      [user.id]
    );

    return NextResponse.json({ workspaces: result.rows });
  } catch (error: any) {
    console.error('Error fetching workspaces:', error);
    return NextResponse.json({ error: 'Failed to fetch workspaces' }, { status: 500 });
  }
};

export const GET = withMcpAuth(handler);

