import { NextRequest, NextResponse } from 'next/server';
import { resolveWorkspace } from '@/src/server/workspace-resolver';
import { TagRepo } from '@/src/server/repo/tag';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ws: string; projectSlug: string; documentId: string }> }
) {
  try {
    const { ws, projectSlug, documentId } = await params;
    const workspaceId = await resolveWorkspace(ws);
    
    const body = await request.json();
    const { tag } = body;
    
    if (!tag || typeof tag !== 'string' || !tag.trim()) {
      return NextResponse.json({ error: 'Tag is required' }, { status: 400 });
    }
    
    const tagRepo = new TagRepo();
    await tagRepo.attachToDocument(workspaceId, parseInt(documentId), tag.trim());
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error adding tag:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
