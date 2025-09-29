import { NextRequest } from 'next/server';
import { getDb } from '../../../../../db/index';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (!Number.isFinite(id)) return new Response(JSON.stringify({ error: 'Invalid id' }), { status: 400 });

    const body = await req.json().catch(() => ({}));
    const tag = (body?.tag as string | undefined)?.trim();
    if (!tag) return new Response(JSON.stringify({ error: 'Missing tag' }), { status: 400 });

    const db = getDb();
    const upsertTag = db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)');
    const findTag = db.prepare('SELECT id FROM tags WHERE name = ?');
    const insertJoin = db.prepare('INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)');

    upsertTag.run(tag);
    const row = findTag.get(tag) as { id: number } | undefined;
    if (!row) return new Response(JSON.stringify({ error: 'Tag error' }), { status: 500 });
    insertJoin.run(id, row.id);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Unexpected error' }), { status: 500 });
  }
}



