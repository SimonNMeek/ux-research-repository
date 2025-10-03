import { NextRequest, NextResponse } from 'next/server';
import { resolveWorkspace } from '@/src/server/workspace-resolver';
import { DocumentRepo } from '@/src/server/repo/document';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ws: string; projectSlug: string; documentId: string }> }
) {
  try {
    const { ws, projectSlug, documentId } = await params;
    const workspaceId = await resolveWorkspace(ws);
    
    const documentRepo = new DocumentRepo();
    const document = await documentRepo.getById(parseInt(documentId), workspaceId);
    
    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }
    
    return NextResponse.json({ document });
  } catch (error: any) {
    console.error('Error fetching document:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ ws: string; projectSlug: string; documentId: string }> }
) {
  try {
    const { ws, projectSlug, documentId } = await params;
    const workspaceId = await resolveWorkspace(ws);
    
    const documentRepo = new DocumentRepo();
    const success = documentRepo.deleteWithWorkspaceValidation(parseInt(documentId), workspaceId);
    
    if (!success) {
      return NextResponse.json({ error: 'Document not found or access denied' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting document:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
