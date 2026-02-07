import { NextRequest, NextResponse } from 'next/server';
import { withMcpAuth, McpContext, trackMcpUsage } from '@/lib/mcp-middleware';
import { getDbAdapter, getDbType } from '@/db/adapter';
import { getDb } from '@/db';

const handler = async (context: McpContext, request: NextRequest) => {
  const { user, workspace } = context;

  if (!workspace) {
    return NextResponse.json(
      { error: 'workspace parameter is required' },
      { status: 400 }
    );
  }

  const url = new URL(request.url);
  const adapter = getDbAdapter();
  const dbType = getDbType();

  // GET - Fetch a specific document or list documents
  if (request.method === 'GET') {
    const documentId = url.searchParams.get('id');

    await trackMcpUsage(user, '/api/mcp/documents', workspace.id);

    try {
      if (documentId) {
        // Get specific document with full content
        let document: any;
        if (dbType === 'postgres') {
          const result = await adapter.query(`
            SELECT d.*, p.slug as project_slug, p.name as project_name
            FROM documents d
            INNER JOIN projects p ON d.project_id = p.id
            WHERE d.id = $1 AND p.workspace_id = $2
          `, [parseInt(documentId), workspace.id]);
          document = result.rows[0];
        } else {
          const db = getDb();
          document = db.prepare(`
            SELECT d.*, p.slug as project_slug, p.name as project_name
            FROM documents d
            INNER JOIN projects p ON d.project_id = p.id
            WHERE d.id = ? AND p.workspace_id = ?
          `).get(parseInt(documentId), workspace.id);
        }

        if (!document) {
          return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        return NextResponse.json({ document });
      } else {
        // List recent documents
        const limit = parseInt(url.searchParams.get('limit') || '20');
        const projectSlug = url.searchParams.get('project');

        let documents: any[];
        if (dbType === 'postgres') {
          const result = await adapter.query(`
            SELECT d.id, d.title, d.is_favorite, d.created_at,
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
            SELECT d.id, d.title, d.is_favorite, d.created_at,
                   p.slug as project_slug, p.name as project_name
            FROM documents d
            INNER JOIN projects p ON d.project_id = p.id
            WHERE p.workspace_id = ?
            ${projectSlug ? 'AND p.slug = ?' : ''}
            ORDER BY d.created_at DESC
            LIMIT ?
          `).all(projectSlug ? [workspace.id, projectSlug, limit] : [workspace.id, limit]);
        }

        // Get project info for response
        let project: any;
        if (dbType === 'postgres') {
          const projectResult = await adapter.query(`
            SELECT id, slug, name, description, created_at
            FROM projects
            WHERE workspace_id = $1 AND slug = $2
          `, [workspace.id, projectSlug]);
          project = projectResult.rows[0];
        } else {
          const db = getDb();
          project = db.prepare(`
            SELECT id, slug, name, description, created_at
            FROM projects
            WHERE workspace_id = ? AND slug = ?
          `).get(workspace.id, projectSlug);
        }

        return NextResponse.json({ 
          documents: documents.map(doc => ({
            id: doc.id,
            title: doc.title,
            is_favorite: Boolean(doc.is_favorite),
            created_at: doc.created_at
          })),
          project: project ? {
            id: project.id,
            slug: project.slug,
            name: project.name,
            description: project.description,
            created_at: project.created_at
          } : null
        });
      }
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }
  }

  // POST - Create a new document
  if (request.method === 'POST') {
    await trackMcpUsage(user, '/api/mcp/documents:create', workspace.id);

    try {
      const { title, content, project_slug } = await request.json();

      if (!title || !project_slug) {
        return NextResponse.json(
          { error: 'title and project_slug are required' },
          { status: 400 }
        );
      }

      // Get project ID
      let project: any;
      if (dbType === 'postgres') {
        const result = await adapter.query(
          'SELECT id FROM projects WHERE slug = $1 AND workspace_id = $2',
          [project_slug, workspace.id]
        );
        project = result.rows[0];
      } else {
        const db = getDb();
        project = db.prepare(
          'SELECT id FROM projects WHERE slug = ? AND workspace_id = ?'
        ).get(project_slug, workspace.id);
      }

      if (!project) {
        return NextResponse.json(
          { error: `Project '${project_slug}' not found in workspace '${workspace.slug}'` },
          { status: 404 }
        );
      }

      // Create document
      // Note: The documents table uses 'body' column, not 'content'
      let documentId: number;
      if (dbType === 'postgres') {
        const result = await adapter.query(`
          INSERT INTO documents (project_id, title, body)
          VALUES ($1, $2, $3)
          RETURNING id
        `, [project.id, title, content || '']);
        documentId = result.rows[0].id;
      } else {
        const db = getDb();
        const result = db.prepare(`
          INSERT INTO documents (project_id, title, body)
          VALUES (?, ?, ?)
        `).run(project.id, title, content || '');
        documentId = result.lastInsertRowid as number;
      }

      return NextResponse.json(
        {
          message: 'Document created successfully',
          document: { id: documentId, title, project_slug }
        },
        { status: 201 }
      );
    } catch (error: any) {
      console.error('Error creating document:', error);
      return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
};

export const GET = withMcpAuth(handler);
export const POST = withMcpAuth(handler);

