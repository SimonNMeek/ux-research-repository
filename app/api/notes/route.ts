import { NextRequest } from 'next/server';
export const runtime = 'nodejs';
import { getDb } from '../../../db/index';
import { AnonymizationPipeline } from '@sol/anonymizer';
import { ConfigLoader } from '@sol/anonymizer';
import { v4 as uuidv4 } from 'uuid';

type CreateBody = {
  filename: string;
  content: string;
  tags?: string[];
  anonymize?: boolean;
  anonymizationConfig?: any;
};

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let body: CreateBody;

    if (contentType.includes('application/json')) {
      body = await req.json();
    } else if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const files = form.getAll('files') as File[];
      const tagsStr = (form.get('tags') as string) || '';
      const tags = tagsStr
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const anonymize = form.get('anonymize') === 'true';
      const anonymizationConfigStr = (form.get('anonymizationConfig') as string) || '';
      let anonymizationConfig = null;
      if (anonymizationConfigStr) {
        try {
          anonymizationConfig = JSON.parse(anonymizationConfigStr);
        } catch (e) {
          // Use default config if parsing fails
          anonymizationConfig = ConfigLoader.createDefaultConfig();
        }
      }

      if (files.length === 0) {
        return new Response(JSON.stringify({ error: 'Missing files' }), { status: 400 });
      }

      // Process multiple files
      const results = [];
      for (const file of files) {
        if (!(file instanceof File)) {
          continue;
        }
        const filename = file.name;
        const arrayBuffer = await file.arrayBuffer();
        const content = Buffer.from(arrayBuffer).toString('utf8');
        
        // Validate each file
        const MAX_BYTES = 2 * 1024 * 1024;
        const isTxt = filename.endsWith('.txt');
        const isMd = filename.endsWith('.md');
        if (!isTxt && !isMd) {
          results.push({ filename, error: 'Only .txt and .md allowed' });
          continue;
        }
        if (Buffer.byteLength(content, 'utf8') > MAX_BYTES) {
          results.push({ filename, error: 'File too large (max 2MB)' });
          continue;
        }

        const db = getDb();
        
        let finalContent = content;
        let originalText = null;
        let cleanText = null;
        let anonymizationProfileId = null;
        let cleanVersion = 0;
        
        // Apply anonymization if requested
        let anonymizationResult = null;
        if (anonymize && anonymizationConfig) {
          const pipeline = new AnonymizationPipeline(anonymizationConfig);
          anonymizationResult = await pipeline.anonymizeText(content);
          
          finalContent = anonymizationResult.anonymizedText;
          originalText = content;
          cleanText = anonymizationResult.anonymizedText;
          cleanVersion = 1;
          
          // Store anonymization profile
          const profileId = uuidv4();
          const insertProfile = db.prepare(
            'INSERT INTO anonymization_profiles (id, name, config, created_by) VALUES (?, ?, ?, ?)'
          );
          insertProfile.run(profileId, 'Upload Profile', JSON.stringify(anonymizationConfig), 'system');
          anonymizationProfileId = profileId;
        }
        
        const insertNote = db.prepare(
          'INSERT INTO notes (filename, content, original_text, clean_text, anonymization_profile_id, clean_version) VALUES (?, ?, ?, ?, ?, ?)' 
        );
        const info = insertNote.run(filename, finalContent, originalText, cleanText, anonymizationProfileId, cleanVersion);
        const noteId = Number(info.lastInsertRowid);
        
        // Store audit record if anonymization was applied
        if (anonymize && anonymizationConfig && anonymizationProfileId && anonymizationResult) {
          const insertAudit = db.prepare(
            'INSERT INTO anonymization_audit (document_id, profile_id, detector_version, summary, duration_ms) VALUES (?, ?, ?, ?, ?)'
          );
          insertAudit.run(noteId, anonymizationProfileId, '1.0.0', JSON.stringify(anonymizationResult.summary), anonymizationResult.duration);
        }

        if (tags && tags.length > 0) {
          const upsertTag = db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)');
          const findTag = db.prepare('SELECT id FROM tags WHERE name = ?');
          const insertJoin = db.prepare('INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)');
          const tx = db.transaction((tagList: string[]) => {
            for (const tag of tagList) {
              upsertTag.run(tag);
              const row = findTag.get(tag) as { id: number } | undefined;
              if (row) insertJoin.run(noteId, row.id);
            }
          });
          tx(tags);
        }

        results.push({ filename, id: noteId });
      }

      return new Response(JSON.stringify({ results }), { status: 201, headers: { 'content-type': 'application/json' } });
    } else {
      return new Response(JSON.stringify({ error: 'Unsupported content type' }), { status: 415 });
    }

    // Handle JSON requests (single file)
    if (body) {
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
      
      let finalContent = body.content;
      let originalText = null;
      let cleanText = null;
      let anonymizationProfileId = null;
      let cleanVersion = 0;
      
      // Apply anonymization if requested
      let anonymizationResult = null;
      if (body.anonymize && body.anonymizationConfig) {
        const pipeline = new AnonymizationPipeline(body.anonymizationConfig);
        anonymizationResult = await pipeline.anonymizeText(body.content);
        
        finalContent = anonymizationResult.anonymizedText;
        originalText = body.content;
        cleanText = anonymizationResult.anonymizedText;
        cleanVersion = 1;
        
        // Store anonymization profile
        const profileId = uuidv4();
        const insertProfile = db.prepare(
          'INSERT INTO anonymization_profiles (id, name, config, created_by) VALUES (?, ?, ?, ?)'
        );
        insertProfile.run(profileId, 'Upload Profile', JSON.stringify(body.anonymizationConfig), 'system');
        anonymizationProfileId = profileId;
      }
      
      const insertNote = db.prepare(
        'INSERT INTO notes (filename, content, original_text, clean_text, anonymization_profile_id, clean_version) VALUES (?, ?, ?, ?, ?, ?)' 
      );
      const info = insertNote.run(body.filename, finalContent, originalText, cleanText, anonymizationProfileId, cleanVersion);
      const noteId = Number(info.lastInsertRowid);
      
      // Store audit record if anonymization was applied
      if (body.anonymize && body.anonymizationConfig && anonymizationProfileId && anonymizationResult) {
        const insertAudit = db.prepare(
          'INSERT INTO anonymization_audit (document_id, profile_id, detector_version, summary, duration_ms) VALUES (?, ?, ?, ?, ?)'
        );
        insertAudit.run(noteId, anonymizationProfileId, '1.0.0', JSON.stringify(anonymizationResult.summary), anonymizationResult.duration);
      }

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

      // For preview requests, return anonymization results without creating a file
      if (body.anonymize && body.anonymizationConfig && body.filename === 'preview.txt') {
        const pipeline = new AnonymizationPipeline(body.anonymizationConfig);
        const result = await pipeline.anonymizeText(body.content);
        
        return new Response(JSON.stringify({ 
          anonymizedText: result.anonymizedText,
          matches: result.matches,
          summary: result.summary
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      return new Response(JSON.stringify({ id: noteId }), { status: 201, headers: { 'content-type': 'application/json' } });
    }
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
      // Use LIKE for partial matches in filename, and FTS for content
      const likePattern = `%${q}%`;
      const ftsQuery = q.split(' ').map(term => `*${term}*`).join(' ');
      
      // First try filename matches
      const filenameStmt = db.prepare(
        `SELECT id, filename, filename AS snippet FROM notes WHERE filename LIKE ? ORDER BY filename`);
      const filenameRows = filenameStmt.all(likePattern) as Array<{ id: number; filename: string; snippet: string }>;
      for (const r of filenameRows) noteIdSet.add(r.id);
      
      // Then try FTS content matches (excluding already found files)
      if (noteIdSet.size === 0) {
        const ftsStmt = db.prepare(
          `SELECT n.id, n.filename, snippet(notes_fts, 1, '<b>', '</b>', '…', 10) AS snippet
           FROM notes_fts f JOIN notes n ON n.id = f.rowid
           WHERE notes_fts MATCH ?`);
        const ftsRows = ftsStmt.all(ftsQuery) as Array<{ id: number; filename: string; snippet: string }>;
        for (const r of ftsRows) noteIdSet.add(r.id);
      }
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
      `SELECT n.id, n.filename, substr(n.content, 1, 200) AS snippet, n.is_favorite, n.created_at
       FROM notes n WHERE n.id IN (${placeholders})`
    ).all(...ids) as Array<{ id: number; filename: string; snippet: string; is_favorite: number; created_at: string }>;

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

    const results = rows.map((r) => ({ 
      id: r.id, 
      filename: r.filename, 
      snippet: r.snippet, 
      tags: idToTags.get(r.id) || [],
      is_favorite: Boolean(r.is_favorite),
      created_at: r.created_at
    }));
    return new Response(JSON.stringify({ results }), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Unexpected error' }), { status: 500 });
  }
}


