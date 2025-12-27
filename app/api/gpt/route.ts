import { NextRequest, NextResponse } from 'next/server';
import { getDbAdapter, getDbType } from '@/db/adapter';
import { getDb } from '@/db';

/**
 * Public endpoint for GPT access - no authentication required
 * Returns basic workspace and project information
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const workspaceSlug = url.searchParams.get('workspace');
    const projectSlug = url.searchParams.get('project');
    const query = url.searchParams.get('query');

    const adapter = getDbAdapter();
    const dbType = getDbType();

    // If no workspace specified, return list of workspaces
    if (!workspaceSlug) {
      let workspaces: any[];
      if (dbType === 'postgres') {
        const result = await adapter.query(`
          SELECT w.id, w.slug, w.name, w.created_at, o.name as organization_name
          FROM workspaces w
          INNER JOIN organizations o ON w.organization_id = o.id
          ORDER BY w.name
        `);
        workspaces = result.rows;
      } else {
        const db = getDb();
        workspaces = db.prepare(`
          SELECT w.id, w.slug, w.name, w.created_at, o.name as organization_name
          FROM workspaces w
          INNER JOIN organizations o ON w.organization_id = o.id
          ORDER BY w.name
        `).all();
      }

      return NextResponse.json({
        workspaces: workspaces.map(w => ({
          id: w.id,
          slug: w.slug,
          name: w.name,
          organization: w.organization_name,
          created_at: w.created_at
        }))
      });
    }

    // Get workspace info
    let workspace: any;
    if (dbType === 'postgres') {
      const result = await adapter.query(`
        SELECT w.id, w.slug, w.name, w.created_at, o.name as organization_name
        FROM workspaces w
        INNER JOIN organizations o ON w.organization_id = o.id
        WHERE w.slug = $1
      `, [workspaceSlug]);
      workspace = result.rows[0];
    } else {
      const db = getDb();
      workspace = db.prepare(`
        SELECT w.id, w.slug, w.name, w.created_at, o.name as organization_name
        FROM workspaces w
        INNER JOIN organizations o ON w.organization_id = o.id
        WHERE w.slug = ?
      `).get(workspaceSlug);
    }

    if (!workspace) {
      return NextResponse.json(
        { error: `Workspace '${workspaceSlug}' not found` },
        { status: 404 }
      );
    }

    // If no project specified, return list of projects for workspace
    if (!projectSlug) {
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

      return NextResponse.json({
        workspace: {
          id: workspace.id,
          slug: workspace.slug,
          name: workspace.name,
          organization: workspace.organization_name,
          created_at: workspace.created_at
        },
        projects: projects.map(p => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          description: p.description,
          document_count: parseInt(p.document_count),
          created_at: p.created_at
        }))
      });
    }

    // Get project info
    let project: any;
    if (dbType === 'postgres') {
      const result = await adapter.query(`
        SELECT p.id, p.slug, p.name, p.description, p.created_at
        FROM projects p
        WHERE p.workspace_id = $1 AND p.slug = $2
      `, [workspace.id, projectSlug]);
      project = result.rows[0];
    } else {
      const db = getDb();
      project = db.prepare(`
        SELECT p.id, p.slug, p.name, p.description, p.created_at
        FROM projects p
        WHERE p.workspace_id = ? AND p.slug = ?
      `).get(workspace.id, projectSlug);
    }

    if (!project) {
      return NextResponse.json(
        { error: `Project '${projectSlug}' not found in workspace '${workspaceSlug}'` },
        { status: 404 }
      );
    }

    // Get documents for the project
    let documents: any[];
    if (dbType === 'postgres') {
      const result = await adapter.query(`
        SELECT d.id, d.title, d.body, d.created_at, d.is_favorite
        FROM documents d
        WHERE d.project_id = $1
        ORDER BY d.created_at DESC
        LIMIT 50
      `, [project.id]);
      documents = result.rows;
    } else {
      const db = getDb();
      documents = db.prepare(`
        SELECT d.id, d.title, d.body, d.created_at, d.is_favorite
        FROM documents d
        WHERE d.project_id = ?
        ORDER BY d.created_at DESC
        LIMIT 50
      `).all(project.id);
    }

    return NextResponse.json({
      workspace: {
        id: workspace.id,
        slug: workspace.slug,
        name: workspace.name,
        organization: workspace.organization_name,
        created_at: workspace.created_at
      },
      project: {
        id: project.id,
        slug: project.slug,
        name: project.name,
        description: project.description,
        created_at: project.created_at
      },
      documents: documents.map(d => ({
        id: d.id,
        title: d.title,
        body: d.body,
        is_favorite: Boolean(d.is_favorite),
        created_at: d.created_at
      }))
    });

  } catch (error: any) {
    console.error('GPT API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
