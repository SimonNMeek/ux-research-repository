import { NextRequest } from 'next/server';
import { withWorkspace, WorkspaceRouteHandler } from '../../../../../src/server/workspace-resolver';
import { TagRepo } from '../../../../../src/server/repo/tag';

export const runtime = 'nodejs';

const tagRepo = new TagRepo();

const handler: WorkspaceRouteHandler = async (context, req) => {
  const { workspace } = context;

  if (req.method === 'GET') {
    try {
      const url = new URL(req.url);
      const includeStats = url.searchParams.get('stats') === 'true';

      if (includeStats) {
        const tagStats = tagRepo.getUsageStats(workspace.id);
        return new Response(
          JSON.stringify({ 
            tags: tagStats.map(stat => ({
              ...stat.tag,
              document_count: stat.document_count
            }))
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' }
          }
        );
      } else {
        const tags = tagRepo.list(workspace.id);
        return new Response(
          JSON.stringify({ tags }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' }
          }
        );
      }
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error.message || 'Failed to fetch tags' }),
        { status: 500, headers: { 'content-type': 'application/json' } }
      );
    }
  }

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      const { name } = body;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return new Response(
          JSON.stringify({ error: 'Tag name is required' }),
          { status: 400, headers: { 'content-type': 'application/json' } }
        );
      }

      const tag = tagRepo.upsert(workspace.id, name.trim());

      return new Response(
        JSON.stringify({ tag }),
        {
          status: 201,
          headers: { 'content-type': 'application/json' }
        }
      );
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error.message || 'Failed to create tag' }),
        { status: 500, headers: { 'content-type': 'application/json' } }
      );
    }
  }

  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    { status: 405, headers: { 'content-type': 'application/json' } }
  );
};

export async function GET(req: NextRequest, params: { params: { ws: string } | Promise<{ ws: string }> }) {
  return withWorkspace(handler, req, params);
}

export async function POST(req: NextRequest, params: { params: { ws: string } | Promise<{ ws: string }> }) {
  return withWorkspace(handler, req, params);
}
