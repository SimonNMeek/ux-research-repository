import { NextRequest } from 'next/server';
import { withWorkspace, WorkspaceRouteHandler, workspaceResolver } from '@/src/server/workspace-resolver';
import { TagRepo } from '@/src/server/repo/tag';
import { DocumentRepo } from '@/src/server/repo/document';

const tagRepo = new TagRepo();
const documentRepo = new DocumentRepo();

const handler: WorkspaceRouteHandler = async (context, req, routeParams) => {
  const { workspace } = context;
  
  // Extract params
  const params = routeParams.params instanceof Promise ? await routeParams.params : routeParams.params;
  const { documentId, tag } = params;
  
  if (req.method === 'DELETE') {
    // Check permissions - owner/admin/member can edit tags
    if (!workspaceResolver.canEditDocuments(context)) {
      return new Response(
        JSON.stringify({ error: 'You do not have permission to edit tags in this workspace' }),
        { status: 403, headers: { 'content-type': 'application/json' } }
      );
    }

    try {
      const decodedTag = decodeURIComponent(tag);
      
      // Validate document belongs to workspace
      const document = await documentRepo.getById(parseInt(documentId), workspace.id);
      if (!document) {
        return new Response(
          JSON.stringify({ error: 'Document not found or access denied' }),
          { status: 404, headers: { 'content-type': 'application/json' } }
        );
      }

      // Remove the tag
      await tagRepo.removeTagFromDocument(workspace.id, parseInt(documentId), decodedTag);
      
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    } catch (error: any) {
      console.error('Error removing tag:', error);
      return new Response(
        JSON.stringify({ error: error.message || 'Failed to remove tag' }),
        { status: 500, headers: { 'content-type': 'application/json' } }
      );
    }
  }

  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    { status: 405, headers: { 'content-type': 'application/json' } }
  );
};

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ ws: string; projectSlug: string; documentId: string; tag: string }> }
) {
  return withWorkspace(handler, request, { params });
}
