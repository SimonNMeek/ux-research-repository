import { NextRequest } from 'next/server';
import { getDb } from '../../../../../../db/index';

export const runtime = 'nodejs';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; tag: string } }) {
  try {
    const id = Number(params.id);
    const tag = decodeURIComponent(params.tag).trim();
    if (!Number.isFinite(id) || !tag) {
      return new Response(JSON.stringify({ error: 'Invalid parameters' }), { status: 400 });
    }
    const db = getDb();
    const tagRow = db.prepare('SELECT id FROM tags WHERE name = ?').get(tag) as { id: number } | undefined;
    if (!tagRow) return new Response(JSON.stringify({ ok: true }), { status: 200 });
    db.prepare('DELETE FROM note_tags WHERE note_id = ? AND tag_id = ?').run(id, tagRow.id);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Unexpected error' }), { status: 500 });
  }
}



