import { NextRequest } from 'next/server';
export const runtime = 'nodejs';
import { getDb } from '../../../db/index';

type CreateBody = {
  filename: string;
  content: string;
  tags?: string[];
};

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let body: CreateBody;

    if (contentType.includes('application/json')) {
      body = await req.json();
    } else if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('file');
      const tagsStr = (form.get('tags') as string) || '';
      const tags = tagsStr
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      if (!(file instanceof File)) {
        return new Response(JSON.stringify({ error: 'Missing file' }), { status: 400 });
      }
      const filename = file.name;
      const arrayBuffer = await file.arrayBuffer();
      const content = Buffer.from(arrayBuffer).toString('utf8');
      body = { filename, content, tags };
    } else {
      return new Response(JSON.stringify({ error: 'Unsupported content type' }), { status: 415 });
    }

    // Validate
    const MAX_BYTES = 2 * 1024 * 1024;
    const isTxt = body.filename.endsWith('.txt');
    const isMd = body.filename.endsWith('.md');
    if (!isTxt && !isMd) {
      return new Response(JSON.stringify({ error: 'Only .txt and .md allowed' }), { status: 400 });
    }
    if (Buffer.byteLength(body.content, 'utf8') > MAX_BYTES) {
      return new Response(JSON.stringify({ error: 'File too large (max 2MB)' }), { status: 400 });
    }

    const db = getDb();
    const insertNote = db.prepare(
      'INSERT INTO notes (filename, content) VALUES (?, ?)' 
    );
    const info = insertNote.run(body.filename, body.content);
    const noteId = Number(info.lastInsertRowid);

    if (body.tags && body.tags.length > 0) {
      const upsertTag = db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)');
      const findTag = db.prepare('SELECT id FROM tags WHERE name = ?');
      const insertJoin = db.prepare('INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)');
      const tx = db.transaction((tags: string[]) => {
        for (const tag of tags) {
          upsertTag.run(tag);
          const row = findTag.get(tag) as { id: number } | undefined;
          if (row) insertJoin.run(noteId, row.id);
        }
      });
      tx(body.tags);
    }

    return new Response(JSON.stringify({ id: noteId }), { status: 201, headers: { 'content-type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Unexpected error' }), { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const tag = searchParams.getAll('tag');

    const db = getDb();

    // Build query combining FTS and tags
    const hasQ = q.trim().length > 0;
    const hasTag = tag.length > 0;

    let noteIdSet = new Set<number>();

    if (hasQ) {
      const stmt = db.prepare(
        `SELECT n.id, n.filename, snippet(notes_fts, 1, '<b>', '</b>', '…', 10) AS snippet
         FROM notes_fts f JOIN notes n ON n.id = f.rowid
         WHERE notes_fts MATCH ?
         ORDER BY rank`);
      const rows = stmt.all(q) as Array<{ id: number; filename: string; snippet: string }>;
      for (const r of rows) noteIdSet.add(r.id);
    }

    if (hasTag) {
      // Partial, case-insensitive tag match to support narrowing-as-you-type
      const likeConds = tag.map(() => 'LOWER(t.name) LIKE ?').join(' OR ');
      const likeParams = tag.map((t) => `%${t.toLowerCase()}%`);
      const stmt = db.prepare(
        `SELECT DISTINCT nt.note_id AS id
         FROM note_tags nt
         JOIN tags t ON t.id = nt.tag_id
         WHERE ${likeConds}`);
      const rows = stmt.all(...likeParams) as Array<{ id: number }>;
      const tagSet = new Set(rows.map((r) => r.id));
      if (hasQ) {
        noteIdSet = new Set([...noteIdSet].filter((id) => tagSet.has(id)));
      } else {
        noteIdSet = tagSet;
      }
    }

    if (!hasQ && !hasTag) {
      const all = db.prepare('SELECT id FROM notes ORDER BY created_at DESC LIMIT 50').all() as Array<{ id: number }>;
      noteIdSet = new Set(all.map((r) => r.id));
    }

    const ids = [...noteIdSet];
    if (ids.length === 0) {
      return new Response(JSON.stringify({ results: [] }), { status: 200, headers: { 'content-type': 'application/json' } });
    }

    const placeholders = ids.map(() => '?').join(',');
    const rows = db.prepare(
      `SELECT n.id, n.filename, substr(n.content, 1, 200) AS snippet
       FROM notes n WHERE n.id IN (${placeholders})`
    ).all(...ids) as Array<{ id: number; filename: string; snippet: string }>;

    const tagRows = db.prepare(
      `SELECT nt.note_id AS id, t.name AS tag
       FROM note_tags nt JOIN tags t ON t.id = nt.tag_id
       WHERE nt.note_id IN (${placeholders})`
    ).all(...ids) as Array<{ id: number; tag: string }>;

    const idToTags = new Map<number, string[]>();
    for (const r of tagRows) {
      const list = idToTags.get(r.id) || [];
      list.push(r.tag);
      idToTags.set(r.id, list);
    }

    const results = rows.map((r) => ({ id: r.id, filename: r.filename, snippet: r.snippet, tags: idToTags.get(r.id) || [] }));
    return new Response(JSON.stringify({ results }), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Unexpected error' }), { status: 500 });
  }
}


