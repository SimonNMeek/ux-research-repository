import { NextRequest, NextResponse } from 'next/server';
import { withMcpAuth, McpContext, trackMcpUsage } from '@/lib/mcp-middleware';
import { getDbAdapter, getDbType } from '@/db/adapter';
import { getDb } from '@/db';

const handler = async (context: McpContext, request: NextRequest) => {
  const { user, workspace } = context;

  if (!workspace) {
    return NextResponse.json(
      { error: 'workspace parameter is required. Example: ?workspace=my-workspace' },
      { status: 400 }
    );
  }

  await trackMcpUsage(user, '/api/mcp/projects', workspace.id);

  const adapter = getDbAdapter();
  const dbType = getDbType();

  try {
    let projects: any[];
    if (dbType === 'postgres') {
      const result = await adapter.query(`
        SELECT p.id, p.slug, p.name, p.description, p.created_at,
               COUNT(d.id) as document_count
        FROM projects p
        LEFT JOIN documents d ON p.id = d.project_id
        WHERE p.workspace_id = $1
        GROUP BY p.id
        ORDER BY p.name
      `, [workspace.id]);
      projects = result.rows;
    } else {
      const db = getDb();
      projects = db.prepare(`
        SELECT p.id, p.slug, p.name, p.description, p.created_at,
               COUNT(d.id) as document_count
        FROM projects p
        LEFT JOIN documents d ON p.id = d.project_id
        WHERE p.workspace_id = ?
        GROUP BY p.id
        ORDER BY p.name
      `).all(workspace.id);
    }

    return NextResponse.json({ projects, workspace: { slug: workspace.slug, name: workspace.name } });
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
};

export const GET = withMcpAuth(handler);

