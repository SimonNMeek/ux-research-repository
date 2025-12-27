import { NextRequest, NextResponse } from 'next/server';
import { withMcpAuth, McpContext, trackMcpUsage } from '@/lib/mcp-middleware';
import { query } from '@/db/postgres';

const handler = async (context: McpContext, request: NextRequest) => {
  const { user, workspace } = context;

  if (!workspace) {
    return NextResponse.json(
      { error: 'workspace parameter is required. Example: ?workspace=my-workspace&q=research' },
      { status: 400 }
    );
  }

  const url = new URL(request.url);
  const searchQuery = url.searchParams.get('q') || '';
  const projectSlug = url.searchParams.get('project');
  const limit = parseInt(url.searchParams.get('limit') || '20', 10);

  await trackMcpUsage(user, '/api/mcp/search', workspace.id);

  try {
    let documents: any[] = [];

    if (!searchQuery.trim()) {
      const params: any[] = [workspace.id];
      let projectClause = '';
      let paramIndex = 2;

      if (projectSlug) {
        projectClause = ` AND p.slug = $${paramIndex++}`;
        params.push(projectSlug);
      }

      params.push(limit);
      const limitParam = paramIndex;

      const result = await query(
        `SELECT d.id, d.title, 
                LEFT(d.body, 200) AS content_preview, 
                d.created_at,
                p.slug AS project_slug, p.name AS project_name
           FROM documents d
           INNER JOIN projects p ON d.project_id = p.id
          WHERE p.workspace_id = $1${projectClause}
          ORDER BY d.created_at DESC
          LIMIT $${limitParam}`,
        params
      );

      documents = result.rows;
    } else {
      const params: any[] = [searchQuery, workspace.id];
      let projectClause = '';
      let paramIndex = 3;

      if (projectSlug) {
        projectClause = ` AND p.slug = $${paramIndex++}`;
        params.push(projectSlug);
      }

      const ilikeParam = paramIndex++;
      params.push(`%${searchQuery}%`);
      const bodyIlikeParam = paramIndex++;
      params.push(`%${searchQuery}%`);
      const limitParam = paramIndex;
      params.push(limit);

      const result = await query(
        `SELECT d.id, d.title, 
                LEFT(d.body, 200) AS content_preview, 
                d.created_at,
                p.slug AS project_slug, p.name AS project_name,
                ts_rank(to_tsvector('english', d.title || ' ' || COALESCE(d.body, '')),
                        plainto_tsquery('english', $1)) AS rank
           FROM documents d
           INNER JOIN projects p ON d.project_id = p.id
          WHERE p.workspace_id = $2${projectClause}
            AND (
              to_tsvector('english', d.title || ' ' || COALESCE(d.body, '')) @@ plainto_tsquery('english', $1)
              OR d.title ILIKE $${ilikeParam}
              OR d.body ILIKE $${bodyIlikeParam}
            )
          ORDER BY rank DESC, d.created_at DESC
          LIMIT $${limitParam}`,
        params
      );

      documents = result.rows;
    }

    return NextResponse.json({
      results: documents,
      query: searchQuery,
      workspace: { slug: workspace.slug, name: workspace.name },
      count: documents.length,
    });
  } catch (error: any) {
    console.error('Error searching documents:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
};

export const GET = withMcpAuth(handler);

