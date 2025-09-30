import { NextRequest } from 'next/server';
export const runtime = 'nodejs';
import { getDb } from '../../../../../db/index';
import { AnonymizationPipeline } from '@sol/anonymizer';
import { ConfigLoader } from '@sol/anonymizer';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  try {
    const resolved = params instanceof Promise ? await params : params;
    const { id: idParam } = resolved;
    const id = Number(idParam);
    
    if (!Number.isFinite(id)) {
      return new Response(JSON.stringify({ error: 'Invalid id' }), { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { anonymizationConfig } = body;

    if (!anonymizationConfig) {
      return new Response(JSON.stringify({ error: 'Missing anonymizationConfig' }), { status: 400 });
    }

    const db = getDb();
    
    // Get the original note
    const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as any;
    if (!note) {
      return new Response(JSON.stringify({ error: 'Note not found' }), { status: 404 });
    }

    // Use original text if available, otherwise use current content
    const textToAnonymize = note.original_text || note.content;
    
    // Apply anonymization
    const pipeline = new AnonymizationPipeline(anonymizationConfig);
    const result = await pipeline.anonymizeText(textToAnonymize);
    
    // Store new anonymization profile
    const profileId = uuidv4();
    const insertProfile = db.prepare(
      'INSERT INTO anonymization_profiles (id, name, config, created_by) VALUES (?, ?, ?, ?)'
    );
    insertProfile.run(profileId, 'Re-run Profile', JSON.stringify(anonymizationConfig), 'system');
    
    // Update the note with new clean version
    const newCleanVersion = (note.clean_version || 0) + 1;
    const updateNote = db.prepare(
      'UPDATE notes SET clean_text = ?, anonymization_profile_id = ?, clean_version = ? WHERE id = ?'
    );
    updateNote.run(result.anonymizedText, profileId, newCleanVersion, id);
    
    // Store audit record
    const insertAudit = db.prepare(
      'INSERT INTO anonymization_audit (document_id, profile_id, detector_version, summary, duration_ms) VALUES (?, ?, ?, ?, ?)'
    );
    insertAudit.run(id, profileId, '1.0.0', JSON.stringify(result.summary), result.duration);
    
    return new Response(JSON.stringify({ 
      success: true, 
      anonymizedText: result.anonymizedText,
      summary: result.summary,
      cleanVersion: newCleanVersion
    }), { status: 200, headers: { 'content-type': 'application/json' } });
    
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Unexpected error' }), { status: 500 });
  }
}
