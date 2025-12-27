import { NextRequest, NextResponse } from 'next/server';
import { resolveWorkspace } from '@/src/server/workspace-resolver';
import { TagRepo } from '@/src/server/repo/tag';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ ws: string; projectSlug: string; documentId: string; tag: string }> }
) {
  try {
    const { ws, projectSlug, documentId, tag } = await params;
    const workspaceId = await resolveWorkspace(ws);
    
    const tagRepo = new TagRepo();
    await tagRepo.removeFromDocument(workspaceId, parseInt(documentId), decodeURIComponent(tag));
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error removing tag:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
