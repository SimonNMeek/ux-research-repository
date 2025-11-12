import { query } from '../../../db/postgres';

export interface Document {
  id: number;
  project_id: number;
  title: string;
  body: string;
  original_text?: string | null;
  clean_text?: string | null;
  source_url?: string | null;
  author?: string | null;
  is_favorite: boolean;
  anonymization_profile_id?: string | null;
  clean_version: number;
  created_at: string;
}

export interface DocumentSearchResult extends Document {
  project_slug: string;
  snippet?: string;
  score?: number;
}

function mapDocumentRow(row: any): Document {
  return {
    id: row.id,
    project_id: row.project_id,
    title: row.title,
    body: row.body,
    original_text: row.original_text,
    clean_text: row.clean_text,
    source_url: row.source_url,
    author: row.author,
    is_favorite: Boolean(row.is_favorite),
    anonymization_profile_id: row.anonymization_profile_id,
    clean_version: Number(row.clean_version ?? 0),
    created_at: row.created_at,
  };
}

export class DocumentRepo {
  async create(
    projectId: number,
    data: {
      title: string;
      body: string;
      original_text?: string;
      clean_text?: string;
      source_url?: string;
      author?: string;
      anonymization_profile_id?: string;
      clean_version?: number;
    }
  ): Promise<Document> {
    const result = await query<Document>(
      `INSERT INTO documents (
         project_id, title, body, original_text, clean_text,
         source_url, author, anonymization_profile_id, clean_version
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        projectId,
        data.title,
        data.body,
        data.original_text || null,
        data.clean_text || null,
        data.source_url || null,
        data.author || null,
        data.anonymization_profile_id || null,
        data.clean_version ?? 0,
      ]
    );

    return mapDocumentRow(result.rows[0]);
  }

  async get(id: number): Promise<Document | null> {
    const result = await query<Document>('SELECT * FROM documents WHERE id = $1', [id]);
    const row = result.rows[0];
    return row ? mapDocumentRow(row) : null;
  }

  async list(projectId: number, options: { limit?: number; offset?: number } = {}): Promise<Document[]> {
    const { limit = 50, offset = 0 } = options;
    const result = await query<Document>(
      `SELECT * FROM documents
       WHERE project_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [projectId, limit, offset]
    );

    return result.rows.map(mapDocumentRow);
  }

  async searchFullText(projectIds: number[], searchTerm: string, options: { limit?: number } = {}): Promise<DocumentSearchResult[]> {
    if (projectIds.length === 0) return [];
    const { limit = 50 } = options;
    const placeholders = projectIds.map((_, i) => `$${i + 1}`).join(',');
    const termPlaceholder = `$${projectIds.length + 1}`;
    const limitPlaceholder = `$${projectIds.length + 2}`;

    const result = await query<DocumentSearchResult>(
      `SELECT
         d.*,
         p.slug AS project_slug,
         ts_headline('english', d.body, plainto_tsquery('english', ${termPlaceholder}), 'MaxWords=32, MinWords=16') AS snippet,
         ts_rank(to_tsvector('english', d.title || ' ' || d.body), plainto_tsquery('english', ${termPlaceholder})) AS score
       FROM documents d
       JOIN projects p ON d.project_id = p.id
       WHERE d.project_id IN (${placeholders})
         AND to_tsvector('english', d.title || ' ' || d.body) @@ plainto_tsquery('english', ${termPlaceholder})
       ORDER BY score DESC
       LIMIT ${limitPlaceholder}`,
      [...projectIds, searchTerm, limit]
    );

    return result.rows.map((row) => ({
      ...mapDocumentRow(row),
      project_slug: row.project_slug,
      snippet: row.snippet,
      score: row.score,
    }));
  }

  async searchSimple(projectIds: number[], searchTerm: string, options: { limit?: number } = {}): Promise<DocumentSearchResult[]> {
    if (projectIds.length === 0) return [];
    const { limit = 50 } = options;
    const placeholders = projectIds.map((_, i) => `$${i + 2}`).join(',');
    const likeTerm = `%${searchTerm}%`;

    const result = await query<DocumentSearchResult>(
      `SELECT
         d.*,
         p.slug AS project_slug,
         CASE
           WHEN d.title ILIKE $1 THEN LEFT(d.title, 100)
           ELSE LEFT(d.body, 200)
         END AS snippet
       FROM documents d
       JOIN projects p ON d.project_id = p.id
       WHERE d.project_id IN (${placeholders})
         AND (d.title ILIKE $1 OR d.body ILIKE $1)
       ORDER BY
         CASE WHEN d.title ILIKE $1 THEN 1 ELSE 2 END,
         d.created_at DESC
       LIMIT $${projectIds.length + 2}`,
      [likeTerm, ...projectIds, limit]
    );

    return result.rows.map((row) => ({
      ...mapDocumentRow(row),
      project_slug: row.project_slug,
      snippet: row.snippet,
    }));
  }

  async update(
    id: number,
    data: {
      title?: string;
      body?: string;
      original_text?: string | null;
      clean_text?: string | null;
      source_url?: string | null;
      author?: string | null;
      is_favorite?: boolean;
      anonymization_profile_id?: string | null;
      clean_version?: number;
    }
  ): Promise<Document | null> {
    const updates: string[] = [];
    const values: any[] = [];

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = $${values.length + 1}`);
        values.push(value);
      }
    });

    if (updates.length === 0) {
      return this.get(id);
    }

    values.push(id);
    const result = await query<Document>(
      `UPDATE documents
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    const row = result.rows[0];
    return row ? mapDocumentRow(row) : null;
  }

  async delete(id: number): Promise<boolean> {
    const result = await query('DELETE FROM documents WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async deleteWithWorkspaceValidation(id: number, workspaceId: number): Promise<boolean> {
    const result = await query(
      `DELETE FROM documents
       WHERE id = $1
         AND project_id IN (SELECT id FROM projects WHERE workspace_id = $2)`,
      [id, workspaceId]
    );

    return (result.rowCount ?? 0) > 0;
  }

  async getById(id: number, workspaceId: number): Promise<Document | null> {
    const result = await query<DocumentSearchResult>(
      `SELECT d.*
       FROM documents d
       JOIN projects p ON d.project_id = p.id
       WHERE d.id = $1 AND p.workspace_id = $2`,
      [id, workspaceId]
    );

    const row = result.rows[0];
    return row ? mapDocumentRow(row) : null;
  }

  async toggleFavorite(id: number, workspaceId: number): Promise<{ is_favorite: boolean }> {
    const result = await query<{ is_favorite: boolean }>(
      `UPDATE documents SET is_favorite = NOT is_favorite
       WHERE id = $1 AND project_id IN (
         SELECT id FROM projects WHERE workspace_id = $2
       )
       RETURNING is_favorite`,
      [id, workspaceId]
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error('Document not found or access denied');
    }

    return { is_favorite: Boolean(row.is_favorite) };
  }

  async getFavorites(projectIds: number[], options: { limit?: number } = {}): Promise<DocumentSearchResult[]> {
    if (projectIds.length === 0) return [];
    const { limit = 50 } = options;
    const placeholders = projectIds.map((_, i) => `$${i + 1}`).join(',');
    const limitPlaceholder = `$${projectIds.length + 1}`;

    const result = await query<DocumentSearchResult>(
      `SELECT
         d.*,
         p.slug AS project_slug,
         LEFT(d.body, 200) AS snippet
       FROM documents d
       JOIN projects p ON d.project_id = p.id
       WHERE d.project_id IN (${placeholders})
         AND d.is_favorite = TRUE
       ORDER BY d.created_at DESC
       LIMIT ${limitPlaceholder}`,
      [...projectIds, limit]
    );

    return result.rows.map((row) => ({
      ...mapDocumentRow(row),
      project_slug: row.project_slug,
      snippet: row.snippet,
    }));
  }

  async getWithProject(id: number): Promise<(Document & { workspace_id: number; project_slug: string }) | null> {
    const result = await query<Document & { workspace_id: number; project_slug: string }>(
      `SELECT d.*, p.workspace_id, p.slug AS project_slug
       FROM documents d
       JOIN projects p ON d.project_id = p.id
       WHERE d.id = $1`,
      [id]
    );

    const row = result.rows[0];
    if (!row) return null;

    return {
      ...mapDocumentRow(row),
      workspace_id: row.workspace_id,
      project_slug: row.project_slug,
    };
  }

  async countByProjects(projectIds: number[]): Promise<number> {
    if (projectIds.length === 0) return 0;
    const placeholders = projectIds.map((_, i) => `$${i + 1}`).join(',');
    const result = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM documents WHERE project_id IN (${placeholders})`,
      projectIds
    );
    return Number(result.rows[0]?.count ?? 0);
  }
}
