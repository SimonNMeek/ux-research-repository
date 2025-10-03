import { getDb } from '../../../db/index';

export interface Document {
  id: number;
  project_id: number;
  title: string;
  body: string;
  original_text?: string;
  clean_text?: string;
  source_url?: string;
  author?: string;
  is_favorite: boolean;
  anonymization_profile_id?: string;
  clean_version: number;
  created_at: string;
}

export interface DocumentSearchResult extends Document {
  project_slug: string;
  snippet?: string;
  score?: number;
}

export class DocumentRepo {
  private db = getDb();

  create(projectId: number, data: {
    title: string;
    body: string;
    original_text?: string;
    clean_text?: string;
    source_url?: string;
    author?: string;
    anonymization_profile_id?: string;
    clean_version?: number;
  }): Document {
    const result = this.db
      .prepare(`
        INSERT INTO documents (
          project_id, title, body, original_text, clean_text, 
          source_url, author, anonymization_profile_id, clean_version
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) 
        RETURNING *
      `)
      .get(
        projectId,
        data.title,
        data.body,
        data.original_text || null,
        data.clean_text || null,
        data.source_url || null,
        data.author || null,
        data.anonymization_profile_id || null,
        data.clean_version || 0
      ) as any;
    
    return {
      ...result,
      is_favorite: Boolean(result.is_favorite)
    };
  }

  get(id: number): Document | null {
    const row = this.db
      .prepare('SELECT * FROM documents WHERE id = ?')
      .get(id) as any;
    
    if (!row) return null;
    
    return {
      ...row,
      is_favorite: Boolean(row.is_favorite)
    };
  }

  list(projectId: number, options: { limit?: number; offset?: number } = {}): Document[] {
    const { limit = 50, offset = 0 } = options;
    
    const rows = this.db
      .prepare(`
        SELECT * FROM documents 
        WHERE project_id = ? 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `)
      .all(projectId, limit, offset) as any[];
    
    return rows.map(row => ({
      ...row,
      is_favorite: Boolean(row.is_favorite)
    }));
  }

  searchFullText(projectIds: number[], query: string, options: { limit?: number } = {}): DocumentSearchResult[] {
    if (projectIds.length === 0) return [];
    
    const { limit = 50 } = options;
    const placeholders = projectIds.map(() => '?').join(',');
    
    // Use FTS for full-text search
    const rows = this.db
      .prepare(`
        SELECT 
          d.*,
          p.slug as project_slug,
          snippet(documents_fts, 1, '<mark>', '</mark>', '...', 32) as snippet
        FROM documents_fts fts
        JOIN documents d ON d.id = fts.rowid
        JOIN projects p ON d.project_id = p.id
        WHERE d.project_id IN (${placeholders})
          AND documents_fts MATCH ?
        ORDER BY rank
        LIMIT ?
      `)
      .all(...projectIds, query, limit) as any[];
    
    return rows.map(row => ({
      ...row,
      is_favorite: Boolean(row.is_favorite)
    }));
  }

  // Simple ILIKE search for title and body (fallback)
  searchSimple(projectIds: number[], query: string, options: { limit?: number } = {}): DocumentSearchResult[] {
    if (projectIds.length === 0) return [];
    
    const { limit = 50 } = options;
    const placeholders = projectIds.map(() => '?').join(',');
    const searchTerm = `%${query}%`;
    
    const rows = this.db
      .prepare(`
        SELECT 
          d.*,
          p.slug as project_slug,
          CASE 
            WHEN d.title LIKE ? THEN substr(d.title, 1, 100)
            ELSE substr(d.body, 1, 200)
          END as snippet
        FROM documents d
        JOIN projects p ON d.project_id = p.id
        WHERE d.project_id IN (${placeholders})
          AND (d.title LIKE ? OR d.body LIKE ?)
        ORDER BY 
          CASE WHEN d.title LIKE ? THEN 1 ELSE 2 END,
          d.created_at DESC
        LIMIT ?
      `)
      .all(searchTerm, ...projectIds, searchTerm, searchTerm, searchTerm, limit) as any[];
    
    return rows.map(row => ({
      ...row,
      is_favorite: Boolean(row.is_favorite)
    }));
  }

  update(id: number, data: {
    title?: string;
    body?: string;
    original_text?: string;
    clean_text?: string;
    source_url?: string;
    author?: string;
    is_favorite?: boolean;
    anonymization_profile_id?: string;
    clean_version?: number;
  }): Document | null {
    const updates: string[] = [];
    const values: any[] = [];
    
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    });
    
    if (updates.length === 0) {
      return this.get(id);
    }
    
    values.push(id);
    
    const result = this.db
      .prepare(`UPDATE documents SET ${updates.join(', ')} WHERE id = ? RETURNING *`)
      .get(...values) as any;
    
    if (!result) return null;
    
    return {
      ...result,
      is_favorite: Boolean(result.is_favorite)
    };
  }

  delete(id: number): boolean {
    const result = this.db
      .prepare('DELETE FROM documents WHERE id = ?')
      .run(id);
    
    return result.changes > 0;
  }

  // Delete with workspace validation
  deleteWithWorkspaceValidation(id: number, workspaceId: number): boolean {
    const result = this.db
      .prepare(`
        DELETE FROM documents 
        WHERE id = ? 
        AND project_id IN (
          SELECT id FROM projects WHERE workspace_id = ?
        )
      `)
      .run(id, workspaceId);
    
    return result.changes > 0;
  }

  // Get document by ID with workspace validation
  getById(id: number, workspaceId: number): Document | null {
    const row = this.db
      .prepare(`
        SELECT d.* 
        FROM documents d
        JOIN projects p ON d.project_id = p.id
        WHERE d.id = ? AND p.workspace_id = ?
      `)
      .get(id, workspaceId) as any;
    
    if (!row) return null;
    
    return {
      ...row,
      is_favorite: Boolean(row.is_favorite)
    };
  }

  // Toggle favorite status with workspace validation
  toggleFavorite(id: number, workspaceId: number): { is_favorite: boolean } {
    const result = this.db
      .prepare(`
        UPDATE documents 
        SET is_favorite = NOT is_favorite 
        WHERE id = ? 
        AND project_id IN (
          SELECT id FROM projects WHERE workspace_id = ?
        )
        RETURNING is_favorite
      `)
      .get(id, workspaceId) as any;
    
    if (!result) {
      throw new Error('Document not found or access denied');
    }
    
    return {
      is_favorite: Boolean(result.is_favorite)
    };
  }

  // Get favorite documents
  getFavorites(projectIds: number[], options: { limit?: number } = {}): DocumentSearchResult[] {
    if (projectIds.length === 0) return [];
    
    const { limit = 50 } = options;
    const placeholders = projectIds.map(() => '?').join(',');
    
    const rows = this.db
      .prepare(`
        SELECT 
          d.*,
          p.slug as project_slug,
          substr(d.body, 1, 200) as snippet
        FROM documents d
        JOIN projects p ON d.project_id = p.id
        WHERE d.project_id IN (${placeholders})
          AND d.is_favorite = 1
        ORDER BY d.created_at DESC
        LIMIT ?
      `)
      .all(...projectIds, limit) as any[];
    
    return rows.map(row => ({
      ...row,
      is_favorite: Boolean(row.is_favorite)
    }));
  }

  // Get document with project info for workspace validation
  getWithProject(id: number): (Document & { workspace_id: number; project_slug: string }) | null {
    const row = this.db
      .prepare(`
        SELECT d.*, p.workspace_id, p.slug as project_slug
        FROM documents d
        JOIN projects p ON d.project_id = p.id
        WHERE d.id = ?
      `)
      .get(id) as any;
    
    if (!row) return null;
    
    return {
      ...row,
      is_favorite: Boolean(row.is_favorite)
    };
  }

  // Count documents in projects
  countByProjects(projectIds: number[]): number {
    if (projectIds.length === 0) return 0;
    
    const placeholders = projectIds.map(() => '?').join(',');
    const result = this.db
      .prepare(`SELECT COUNT(*) as count FROM documents WHERE project_id IN (${placeholders})`)
      .get(...projectIds) as any;
    
    return result.count;
  }
}
