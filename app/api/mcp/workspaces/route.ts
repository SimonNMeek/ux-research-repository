import { NextRequest, NextResponse } from 'next/server';
import { withMcpAuth, McpContext, trackMcpUsage } from '@/lib/mcp-middleware';
import { getDbAdapter, getDbType } from '@/db/adapter';
import { getDb } from '@/db';

const handler = async (context: McpContext, request: NextRequest) => {
  const { user } = context;
  const adapter = getDbAdapter();
  const dbType = getDbType();

  await trackMcpUsage(user, '/api/mcp/workspaces');

  try {
    // Super admins see all workspaces
    if (user.system_role === 'super_admin') {
      let workspaces: any[];
      if (dbType === 'postgres') {
        const result = await adapter.query(`
          SELECT w.id, w.slug, w.name, w.created_at, o.name as organization_name
          FROM workspaces w
          LEFT JOIN organizations o ON w.organization_id = o.id
          ORDER BY w.name
        `);
        workspaces = result.rows;
      } else {
        const db = getDb();
        workspaces = db.prepare(`
          SELECT w.id, w.slug, w.name, w.created_at, o.name as organization_name
          FROM workspaces w
          LEFT JOIN organizations o ON w.organization_id = o.id
          ORDER BY w.name
        `).all();
      }
      
      return NextResponse.json({ workspaces });
    }

    // Regular users only see workspaces they have access to
    let workspaces: any[];
    if (dbType === 'postgres') {
      const result = await adapter.query(`
        SELECT w.id, w.slug, w.name, w.created_at, o.name as organization_name, uw.role
        FROM workspaces w
        INNER JOIN user_workspaces uw ON w.id = uw.workspace_id
        LEFT JOIN organizations o ON w.organization_id = o.id
        WHERE uw.user_id = $1
        ORDER BY w.name
      `, [user.id]);
      workspaces = result.rows;
    } else {
      const db = getDb();
      workspaces = db.prepare(`
        SELECT w.id, w.slug, w.name, w.created_at, o.name as organization_name, uw.role
        FROM workspaces w
        INNER JOIN user_workspaces uw ON w.id = uw.workspace_id
        LEFT JOIN organizations o ON w.organization_id = o.id
        WHERE uw.user_id = ?
        ORDER BY w.name
      `).all(user.id);
    }

    return NextResponse.json({ workspaces });
  } catch (error: any) {
    console.error('Error fetching workspaces:', error);
    return NextResponse.json({ error: 'Failed to fetch workspaces' }, { status: 500 });
  }
};

export const GET = withMcpAuth(handler);

