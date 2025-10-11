import { NextRequest } from 'next/server';
import { withWorkspace, WorkspaceRouteHandler, workspaceResolver } from '@/src/server/workspace-resolver';
import { DocumentRepo } from '@/src/server/repo/document';

export const runtime = 'nodejs';

const documentRepo = new DocumentRepo();

const handler: WorkspaceRouteHandler = async (context, req, routeParams) => {
  const { workspace } = context;
  const resolved = routeParams.params instanceof Promise ? await routeParams.params : routeParams.params;
  const { documentId } = resolved;

  if (req.method === 'GET') {
    // All workspace members can view documents
    try {
      const document = await documentRepo.getById(parseInt(documentId), workspace.id);
      
      if (!document) {
        return new Response(
          JSON.stringify({ error: 'Document not found' }),
          { status: 404, headers: { 'content-type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ document }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    } catch (error: any) {
      console.error('Error fetching document:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'content-type': 'application/json' } }
      );
    }
  }

  if (req.method === 'DELETE') {
    // Check workspace-level permissions (owner/admin/member can delete documents)
    if (!workspaceResolver.canEditDocuments(context)) {
      return new Response(
        JSON.stringify({ error: 'You do not have permission to delete documents in this workspace' }),
        { status: 403, headers: { 'content-type': 'application/json' } }
      );
    }

    try {
      const success = documentRepo.deleteWithWorkspaceValidation(parseInt(documentId), workspace.id);
      
      if (!success) {
        return new Response(
          JSON.stringify({ error: 'Document not found or access denied' }),
          { status: 404, headers: { 'content-type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    } catch (error: any) {
      console.error('Error deleting document:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'content-type': 'application/json' } }
      );
    }
  }

  return new Response(
    JSON.stringify({ error: 'Method not allowed' }),
    { status: 405, headers: { 'content-type': 'application/json' } }
  );
};

export async function GET(
  req: NextRequest,
  params: { params: { ws: string; projectSlug: string; documentId: string } | Promise<{ ws: string; projectSlug: string; documentId: string }> }
) {
  return withWorkspace(handler, req, params);
}

export async function DELETE(
  req: NextRequest,
  params: { params: { ws: string; projectSlug: string; documentId: string } | Promise<{ ws: string; projectSlug: string; documentId: string }> }
) {
  return withWorkspace(handler, req, params);
}
