import { PoolClient } from 'pg';
import { query, transaction } from '../../../db/postgres';

export interface Tag {
  id: number;
  workspace_id: number;
  name: string;
  created_at: string;
}

function mapTag(row: any): Tag {
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    name: row.name,
    created_at: row.created_at,
  };
}

export class TagRepo {
  async upsert(workspaceId: number, name: string): Promise<Tag> {
    const existing = await this.getByName(workspaceId, name);
    if (existing) return existing;

    const result = await query<Tag>(
      'INSERT INTO workspace_tags (workspace_id, name) VALUES ($1, $2) RETURNING *',
      [workspaceId, name]
    );
    return mapTag(result.rows[0]);
  }

  async list(workspaceId: number): Promise<Tag[]> {
    const result = await query<Tag>('SELECT * FROM workspace_tags WHERE workspace_id = $1 ORDER BY name', [workspaceId]);
    return result.rows.map(mapTag);
  }

  async getById(id: number): Promise<Tag | null> {
    const result = await query<Tag>('SELECT * FROM workspace_tags WHERE id = $1', [id]);
    const row = result.rows[0];
    return row ? mapTag(row) : null;
  }

  async getByName(workspaceId: number, name: string): Promise<Tag | null> {
    const result = await query<Tag>(
      'SELECT * FROM workspace_tags WHERE workspace_id = $1 AND name = $2',
      [workspaceId, name]
    );
    const row = result.rows[0];
    return row ? mapTag(row) : null;
  }

  async attach(documentId: number, tagIds: number[]): Promise<void> {
    if (tagIds.length === 0) return;

    await transaction(async (client: PoolClient) => {
      await client.query('DELETE FROM document_tags WHERE document_id = $1', [documentId]);
      for (const tagId of tagIds) {
        await client.query('INSERT INTO document_tags (document_id, tag_id) VALUES ($1, $2)', [documentId, tagId]);
      }
    });
  }

  async addToDocument(documentId: number, tagIds: number[]): Promise<void> {
    if (tagIds.length === 0) return;

    await transaction(async (client: PoolClient) => {
      for (const tagId of tagIds) {
        await client.query(
          'INSERT INTO document_tags (document_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [documentId, tagId]
        );
      }
    });
  }

  async removeFromDocument(documentId: number, tagIds: number[]): Promise<void> {
    if (tagIds.length === 0) return;
    const placeholders = tagIds.map((_, i) => `$${i + 2}`).join(',');
    await query(
      `DELETE FROM document_tags WHERE document_id = $1 AND tag_id IN (${placeholders})`,
      [documentId, ...tagIds]
    );
  }

  async getForDocument(documentId: number): Promise<Tag[]> {
    const result = await query<Tag>(
      `SELECT wt.*
       FROM workspace_tags wt
       JOIN document_tags dt ON wt.id = dt.tag_id
       WHERE dt.document_id = $1
       ORDER BY wt.name`,
      [documentId]
    );
    return result.rows.map(mapTag);
  }

  async getDocumentsForTag(tagId: number, options: { limit?: number; offset?: number } = {}): Promise<number[]> {
    const { limit = 50, offset = 0 } = options;
    const result = await query<{ document_id: number }>(
      `SELECT document_id FROM document_tags WHERE tag_id = $1 LIMIT $2 OFFSET $3`,
      [tagId, limit, offset]
    );
    return result.rows.map((row) => row.document_id);
  }

  async upsertMany(workspaceId: number, names: string[]): Promise<number[]> {
    if (names.length === 0) return [];

    const tagIds: number[] = [];
    await transaction(async () => {
      for (const name of names) {
        const tag = await this.upsert(workspaceId, name);
        tagIds.push(tag.id);
      }
    });

    return tagIds;
  }

  async deleteUnused(workspaceId: number): Promise<number> {
    const result = await query(
      `DELETE FROM workspace_tags
       WHERE workspace_id = $1
         AND id NOT IN (SELECT DISTINCT tag_id FROM document_tags)`,
      [workspaceId]
    );
    return result.rowCount ?? 0;
  }

  async getUsageStats(workspaceId: number): Promise<Array<{ tag: Tag; document_count: number }>> {
    const result = await query<Tag & { document_count: number }>(
      `SELECT wt.*, COUNT(dt.document_id) AS document_count
       FROM workspace_tags wt
       LEFT JOIN document_tags dt ON wt.id = dt.tag_id
       WHERE wt.workspace_id = $1
       GROUP BY wt.id
       ORDER BY document_count DESC, wt.name`,
      [workspaceId]
    );

    return result.rows.map((row) => ({
      tag: mapTag(row),
      document_count: Number(row.document_count ?? 0),
    }));
  }

  async attachToDocument(workspaceId: number, documentId: number, tagName: string): Promise<void> {
    const tag = await this.upsert(workspaceId, tagName);
    await query(
      'INSERT INTO document_tags (document_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [documentId, tag.id]
    );
  }

  async removeTagFromDocument(workspaceId: number, documentId: number, tagName: string): Promise<void> {
    const tag = await this.getByName(workspaceId, tagName);
    if (!tag) return;
    await query('DELETE FROM document_tags WHERE document_id = $1 AND tag_id = $2', [documentId, tag.id]);
  }
}
