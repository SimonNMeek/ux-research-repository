import { NextRequest } from 'next/server';
import { getDb } from '../../../db/index';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest) {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT name FROM tags ORDER BY name COLLATE NOCASE').all() as Array<{ name: string }>;
    return new Response(JSON.stringify({ tags: rows.map((r) => r.name) }), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Unexpected error' }), { status: 500 });
  }
}



