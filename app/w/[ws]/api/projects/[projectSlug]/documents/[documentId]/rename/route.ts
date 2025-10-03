import { NextRequest, NextResponse } from 'next/server';
import { resolveWorkspace } from '@/src/server/workspace-resolver';
import { DocumentRepo } from '@/src/server/repo/document';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ws: string; projectSlug: string; documentId: string }> }
) {
  try {
    const { ws, projectSlug, documentId } = await params;
    const workspaceId = await resolveWorkspace(ws);
    
    const body = await request.json();
    const { title } = body;
    
    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    
    const documentRepo = new DocumentRepo();
    const updatedDocument = documentRepo.update(parseInt(documentId), { title: title.trim() });
    
    if (!updatedDocument) {
      return NextResponse.json({ error: 'Document not found or access denied' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, document: updatedDocument });
  } catch (error: any) {
    console.error('Error renaming document:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
