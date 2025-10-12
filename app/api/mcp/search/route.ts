import { NextRequest, NextResponse } from 'next/server';
import { withMcpAuth, McpContext, trackMcpUsage } from '@/lib/mcp-middleware';
import { getDbAdapter, getDbType } from '@/db/adapter';
import { getDb } from '@/db';

const handler = async (context: McpContext, request: NextRequest) => {
  const { user, workspace } = context;

  if (!workspace) {
    return NextResponse.json(
      { error: 'workspace parameter is required. Example: ?workspace=my-workspace&q=research' },
      { status: 400 }
    );
  }

  const url = new URL(request.url);
  const query = url.searchParams.get('q') || '';
  const projectSlug = url.searchParams.get('project');
  const limit = parseInt(url.searchParams.get('limit') || '20');

  await trackMcpUsage(user, '/api/mcp/search', workspace.id);

  const adapter = getDbAdapter();
  const dbType = getDbType();

  try {
    let documents: any[];

    if (!query.trim()) {
      // No query - return recent documents
      if (dbType === 'postgres') {
        const result = await adapter.query(`
          SELECT d.id, d.title, d.content_preview, d.created_at,
                 p.slug as project_slug, p.name as project_name
          FROM documents d
          INNER JOIN projects p ON d.project_id = p.id
          WHERE p.workspace_id = $1
          ${projectSlug ? 'AND p.slug = $2' : ''}
          ORDER BY d.created_at DESC
          LIMIT $${projectSlug ? '3' : '2'}
        `, projectSlug ? [workspace.id, projectSlug, limit] : [workspace.id, limit]);
        documents = result.rows;
      } else {
        const db = getDb();
        documents = db.prepare(`
          SELECT d.id, d.title, d.content_preview, d.created_at,
                 p.slug as project_slug, p.name as project_name
          FROM documents d
          INNER JOIN projects p ON d.project_id = p.id
          WHERE p.workspace_id = ?
          ${projectSlug ? 'AND p.slug = ?' : ''}
          ORDER BY d.created_at DESC
          LIMIT ?
        `).all(projectSlug ? [workspace.id, projectSlug, limit] : [workspace.id, limit]);
      }
    } else {
      // Full-text search
      if (dbType === 'postgres') {
        // PostgreSQL full-text search
        const result = await adapter.query(`
          SELECT d.id, d.title, d.content_preview, d.created_at,
                 p.slug as project_slug, p.name as project_name,
                 ts_rank(to_tsvector('english', d.title || ' ' || COALESCE(d.content_preview, '')), plainto_tsquery('english', $1)) as rank
          FROM documents d
          INNER JOIN projects p ON d.project_id = p.id
          WHERE p.workspace_id = $2
          ${projectSlug ? 'AND p.slug = $3' : ''}
          AND (
            to_tsvector('english', d.title || ' ' || COALESCE(d.content_preview, '')) @@ plainto_tsquery('english', $1)
            OR d.title ILIKE $${projectSlug ? '4' : '3'}
          )
          ORDER BY rank DESC, d.created_at DESC
          LIMIT $${projectSlug ? '5' : '4'}
        `, projectSlug 
          ? [query, workspace.id, projectSlug, `%${query}%`, limit]
          : [query, workspace.id, `%${query}%`, limit]
        );
        documents = result.rows;
      } else {
        // SQLite full-text search using LIKE (FTS5 would be better but requires setup)
        const db = getDb();
        documents = db.prepare(`
          SELECT d.id, d.title, d.content_preview, d.created_at,
                 p.slug as project_slug, p.name as project_name
          FROM documents d
          INNER JOIN projects p ON d.project_id = p.id
          WHERE p.workspace_id = ?
          ${projectSlug ? 'AND p.slug = ?' : ''}
          AND (d.title LIKE ? OR d.content_preview LIKE ?)
          ORDER BY d.created_at DESC
          LIMIT ?
        `).all(
          projectSlug 
            ? [workspace.id, projectSlug, `%${query}%`, `%${query}%`, limit]
            : [workspace.id, `%${query}%`, `%${query}%`, limit]
        );
      }
    }

    return NextResponse.json({
      results: documents,
      query,
      workspace: { slug: workspace.slug, name: workspace.name },
      count: documents.length
    });
  } catch (error: any) {
    console.error('Error searching documents:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
};

export const GET = withMcpAuth(handler);

