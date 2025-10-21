import { NextRequest } from 'next/server';
import { withWorkspace, WorkspaceRouteHandler } from '../../../../../src/server/workspace-resolver';
import { ProjectRepo } from '../../../../../src/server/repo/project';
import { DocumentRepo } from '../../../../../src/server/repo/document';
import { getDbAdapter, getDbType } from '../../../../../db/adapter';

export const runtime = 'nodejs';

const projectRepo = new ProjectRepo();
const documentRepo = new DocumentRepo();

const handler: WorkspaceRouteHandler = async (context, req) => {
  const { workspace } = context;

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'content-type': 'application/json' } }
    );
  }

  try {
    const body = await req.json();
    const { q, mode = 'fulltext', projectSlugs, limit = 50 } = body;

    // Special case for favorites-only mode
    if (mode === 'favorites_only') {
      const startTime = Date.now();
      
      // Get all projects in workspace
      const allProjects = projectRepo.listByWorkspace(workspace.id);
      const projectIds = allProjects.map(p => p.id);
      
      if (projectIds.length === 0) {
        return new Response(
          JSON.stringify({ 
            results: [],
            workspace_slug: workspace.slug,
            metadata: {
              duration_ms: Date.now() - startTime,
              scanned_count: 0,
              mode
            }
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' }
          }
        );
      }
      
      // Get favorites
      const results = await documentRepo.getFavorites(projectIds, { limit });
      const duration = Date.now() - startTime;
      
      return new Response(
        JSON.stringify({
          results: results.map(result => ({
            document_id: result.id,
            project_slug: result.project_slug,
            title: result.title,
            snippet: result.snippet,
            created_at: result.created_at,
            is_favorite: result.is_favorite
          })),
          workspace_slug: workspace.slug,
          metadata: {
            duration_ms: duration,
            scanned_count: results.length,
            mode,
            project_count: projectIds.length
          }
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' }
        }
      );
    }

    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Query parameter "q" is required' }),
        { status: 400, headers: { 'content-type': 'application/json' } }
      );
    }

    if (!['fulltext', 'semantic'].includes(mode)) {
      return new Response(
        JSON.stringify({ error: 'Mode must be "fulltext", "semantic", or "favorites_only"' }),
        { status: 400, headers: { 'content-type': 'application/json' } }
      );
    }

    const startTime = Date.now();

    // Resolve project IDs
    let projectIds: number[];
    
    if (projectSlugs && Array.isArray(projectSlugs) && projectSlugs.length > 0) {
      // Validate that all project slugs belong to this workspace
      projectIds = projectRepo.resolveSlugsToids(workspace.id, projectSlugs);
      
      if (projectIds.length !== projectSlugs.length) {
        const foundProjects = projectRepo.getByIdsInWorkspace(workspace.id, projectIds);
        const foundSlugs = foundProjects.map(p => p.slug);
        const missingSlugs = projectSlugs.filter(slug => !foundSlugs.includes(slug));
        
        return new Response(
          JSON.stringify({ 
            error: 'Project not in active workspace',
            missing_projects: missingSlugs
          }),
          { status: 400, headers: { 'content-type': 'application/json' } }
        );
      }
    } else {
      // Search all projects in workspace
      const allProjects = projectRepo.listByWorkspace(workspace.id);
      projectIds = allProjects.map(p => p.id);
    }

    if (projectIds.length === 0) {
      return new Response(
        JSON.stringify({ 
          results: [],
          workspace_slug: workspace.slug,
          metadata: {
            duration_ms: Date.now() - startTime,
            scanned_count: 0,
            mode
          }
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' }
        }
      );
    }

           // Perform search
           let results;
           if (mode === 'semantic') {
             // For now, fallback to fulltext since we don't have embeddings yet
             // TODO: Implement semantic search when embeddings are available
             results = await documentRepo.searchFullText(projectIds, q, { limit: 50 });
           } else {
             results = await documentRepo.searchFullText(projectIds, q, { limit: 50 });
           }

    const duration = Date.now() - startTime;

    // Log search to database
    const adapter = getDbAdapter();
    const dbType = getDbType();
    
    if (dbType === 'postgres') {
      await adapter.query(`
        INSERT INTO searches (workspace_id, project_ids, query, mode, metadata)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        workspace.id,
        JSON.stringify(projectIds),
        q,
        mode,
        JSON.stringify({
          duration_ms: duration,
          scanned_count: results.length,
          project_slugs: projectSlugs || null
        })
      ]);
    } else {
      adapter.prepare(`
        INSERT INTO searches (workspace_id, project_ids, query, mode, metadata)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        workspace.id,
        JSON.stringify(projectIds),
        q,
        mode,
        JSON.stringify({
          duration_ms: duration,
          scanned_count: results.length,
          project_slugs: projectSlugs || null
        })
      );
    }

    return new Response(
      JSON.stringify({
        results: results.map(result => ({
          document_id: result.id,
          project_slug: result.project_slug,
          title: result.title,
          snippet: result.snippet,
          score: result.score,
          created_at: result.created_at,
          is_favorite: result.is_favorite
        })),
        workspace_slug: workspace.slug,
        metadata: {
          duration_ms: duration,
          scanned_count: results.length,
          mode,
          project_count: projectIds.length
        }
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' }
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Search failed' }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
};

export async function POST(req: NextRequest, params: { params: { ws: string } | Promise<{ ws: string }> }) {
  return withWorkspace(handler, req, params);
}
