import { NextRequest } from 'next/server';
import { getDb } from '../../../../db/index';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  try {
    const resolved = params instanceof Promise ? await params : params;
    const { id: idParam } = resolved;
    const id = Number(idParam);
    if (!Number.isFinite(id)) {
      return new Response(JSON.stringify({ error: 'Invalid id' }), { status: 400 });
    }
    const db = getDb();
    const note = db
      .prepare('SELECT id, filename, content, clean_text, is_favorite FROM notes WHERE id = ?')
      .get(id) as
      | { id: number; filename: string; content: string; clean_text?: string | null; is_favorite: number }
      | undefined;
    if (!note) {
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    }
    const tags = db
      .prepare(
        `SELECT t.name AS tag
         FROM note_tags nt JOIN tags t ON t.id = nt.tag_id
         WHERE nt.note_id = ?`
      )
      .all(id) as Array<{ tag: string }>;
    const contentToReturn = (note as any).clean_text && (note as any).clean_text.length > 0
      ? (note as any).clean_text
      : note.content;

    return new Response(
      JSON.stringify({
        id: note.id,
        filename: note.filename,
        content: contentToReturn,
        tags: tags.map((t) => t.tag),
        is_favorite: Boolean(note.is_favorite),
      }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Unexpected error' }), { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  try {
    const resolved = params instanceof Promise ? await params : params;
    const { id: idParam } = resolved;
    const id = Number(idParam);
    if (!Number.isFinite(id)) {
      return new Response(JSON.stringify({ error: 'Invalid id' }), { status: 400 });
    }
    const db = getDb();
    const res = db.prepare('DELETE FROM notes WHERE id = ?').run(id);
    if (res.changes === 0) {
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Unexpected error' }), { status: 500 });
  }
}



