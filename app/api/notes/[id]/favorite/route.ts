import { NextRequest } from 'next/server';
import { getDb } from '@/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!Number.isFinite(id)) {
      return new Response(JSON.stringify({ error: 'Invalid id' }), { status: 400 });
    }

    const db = getDb();
    
    // Get current favorite status
    const note = db.prepare('SELECT is_favorite FROM notes WHERE id = ?').get(id) as { is_favorite: number } | undefined;
    if (!note) {
      return new Response(JSON.stringify({ error: 'Note not found' }), { status: 404 });
    }

    // Toggle favorite status
    const newFavoriteStatus = note.is_favorite ? 0 : 1;
    db.prepare('UPDATE notes SET is_favorite = ? WHERE id = ?').run(newFavoriteStatus, id);

    return new Response(JSON.stringify({ is_favorite: Boolean(newFavoriteStatus) }), { 
      status: 200, 
      headers: { 'content-type': 'application/json' } 
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Unexpected error' }), { status: 500 });
  }
}
