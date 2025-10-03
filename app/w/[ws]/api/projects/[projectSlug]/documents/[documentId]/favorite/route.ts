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
    
    const documentRepo = new DocumentRepo();
    const result = await documentRepo.toggleFavorite(parseInt(documentId), workspaceId);
    
    return NextResponse.json({ 
      success: true, 
      is_favorite: result.is_favorite 
    });
  } catch (error: any) {
    console.error('Error toggling favorite:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
