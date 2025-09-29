import { NextRequest } from 'next/server';
import { getDb } from '@/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!Number.isFinite(id)) {
      return new Response(JSON.stringify({ error: 'Invalid id' }), { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const newFilename = (body?.filename as string | undefined)?.trim();
    
    if (!newFilename) {
      return new Response(JSON.stringify({ error: 'Missing filename' }), { status: 400 });
    }

    // Validate filename
    if (!newFilename.endsWith('.txt') && !newFilename.endsWith('.md')) {
      return new Response(JSON.stringify({ error: 'Only .txt and .md files allowed' }), { status: 400 });
    }

    const db = getDb();
    
    // Check if note exists
    const note = db.prepare('SELECT id FROM notes WHERE id = ?').get(id) as { id: number } | undefined;
    if (!note) {
      return new Response(JSON.stringify({ error: 'Note not found' }), { status: 404 });
    }

    // Update filename
    db.prepare('UPDATE notes SET filename = ? WHERE id = ?').run(newFilename, id);

    return new Response(JSON.stringify({ filename: newFilename }), { 
      status: 200, 
      headers: { 'content-type': 'application/json' } 
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Unexpected error' }), { status: 500 });
  }
}
