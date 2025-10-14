import { getDb } from '../../../db/index';
import { getDbAdapter, getDbType } from '../../../db/adapter';

export interface Tag {
  id: number;
  workspace_id: number;
  name: string;
  created_at: string;
}

export class TagRepo {
  private getDbConnection() {
    return getDb();
  }

  async upsert(workspaceId: number, name: string): Promise<Tag> {
    const adapter = getDbAdapter();
    const dbType = getDbType();
    
    // Try to get existing tag first
    let existing: any;
    if (dbType === 'postgres') {
      const result = await adapter.query('SELECT * FROM workspace_tags WHERE workspace_id = $1 AND name = $2', [workspaceId, name]);
      existing = result.rows[0];
    } else {
      const db = this.getDbConnection();
      existing = db.prepare('SELECT * FROM workspace_tags WHERE workspace_id = ? AND name = ?').get(workspaceId, name) as any;
    }
    
    if (existing) {
      return existing;
    }
    
    // Create new tag
    let result: any;
    if (dbType === 'postgres') {
      const queryResult = await adapter.query('INSERT INTO workspace_tags (workspace_id, name) VALUES ($1, $2) RETURNING *', [workspaceId, name]);
      result = queryResult.rows[0];
    } else {
      const db = this.getDbConnection();
      result = db.prepare('INSERT INTO workspace_tags (workspace_id, name) VALUES (?, ?) RETURNING *').get(workspaceId, name) as any;
    }
    
    return result;
  }

  list(workspaceId: number): Tag[] {
    const rows = this.getDbConnection()
      .prepare('SELECT * FROM workspace_tags WHERE workspace_id = ? ORDER BY name')
      .all(workspaceId) as any[];
    
    return rows;
  }

  getById(id: number): Tag | null {
    const row = this.getDbConnection()
      .prepare('SELECT * FROM workspace_tags WHERE id = ?')
      .get(id) as any;
    
    return row || null;
  }

  async getByName(workspaceId: number, name: string): Promise<Tag | null> {
    const adapter = getDbAdapter();
    const dbType = getDbType();
    
    let row: any;
    if (dbType === 'postgres') {
      const result = await adapter.query('SELECT * FROM workspace_tags WHERE workspace_id = $1 AND name = $2', [workspaceId, name]);
      row = result.rows[0];
    } else {
      const db = this.getDbConnection();
      row = db.prepare('SELECT * FROM workspace_tags WHERE workspace_id = ? AND name = ?').get(workspaceId, name) as any;
    }
    
    return row || null;
  }

  // Attach tags to a document
  async attach(documentId: number, tagIds: number[]): Promise<void> {
    if (tagIds.length === 0) return;
    
    const adapter = getDbAdapter();
    const dbType = getDbType();
    
    if (dbType === 'postgres') {
      // Remove existing tags first
      await adapter.query('DELETE FROM document_tags WHERE document_id = $1', [documentId]);
      
      // Insert new tags
      for (const tagId of tagIds) {
        await adapter.query('INSERT INTO document_tags (document_id, tag_id) VALUES ($1, $2)', [documentId, tagId]);
      }
    } else {
      // Remove existing tags first
      const db = this.getDbConnection();
      db.prepare('DELETE FROM document_tags WHERE document_id = ?').run(documentId);
      
      // Insert new tags
      const insertStmt = db.prepare('INSERT INTO document_tags (document_id, tag_id) VALUES (?, ?)');
      
      db.transaction(() => {
        for (const tagId of tagIds) {
          insertStmt.run(documentId, tagId);
        }
      })();
    }
  }

  // Add tags to a document (without removing existing ones)
  addToDocument(documentId: number, tagIds: number[]): void {
    if (tagIds.length === 0) return;
    
    const insertStmt = this.getDbConnection().prepare(`
      INSERT OR IGNORE INTO document_tags (document_id, tag_id) VALUES (?, ?)
    `);
    
    this.getDbConnection().transaction(() => {
      for (const tagId of tagIds) {
        insertStmt.run(documentId, tagId);
      }
    })();
  }

  // Remove tags from a document
  removeFromDocument(documentId: number, tagIds: number[]): void {
    if (tagIds.length === 0) return;
    
    const placeholders = tagIds.map(() => '?').join(',');
    this.getDbConnection()
      .prepare(`DELETE FROM document_tags WHERE document_id = ? AND tag_id IN (${placeholders})`)
      .run(documentId, ...tagIds);
  }

  // Get tags for a document
  async getForDocument(documentId: number): Promise<Tag[]> {
    const adapter = getDbAdapter();
    const dbType = getDbType();
    
    let rows: any[];
    if (dbType === 'postgres') {
      const result = await adapter.query(`
        SELECT wt.* 
        FROM workspace_tags wt
        JOIN document_tags dt ON wt.id = dt.tag_id
        WHERE dt.document_id = $1
        ORDER BY wt.name
      `, [documentId]);
      rows = result.rows;
    } else {
      const db = this.getDbConnection();
      rows = db
        .prepare(`
          SELECT wt.* 
          FROM workspace_tags wt
          JOIN document_tags dt ON wt.id = dt.tag_id
          WHERE dt.document_id = ?
          ORDER BY wt.name
        `)
        .all(documentId) as any[];
    }
    
    return rows;
  }

  // Get documents for a tag
  getDocumentsForTag(tagId: number, options: { limit?: number; offset?: number } = {}): number[] {
    const { limit = 50, offset = 0 } = options;
    
    const rows = this.getDbConnection()
      .prepare(`
        SELECT document_id 
        FROM document_tags 
        WHERE tag_id = ?
        LIMIT ? OFFSET ?
      `)
      .all(tagId, limit, offset) as any[];
    
    return rows.map(row => row.document_id);
  }

  // Upsert multiple tags and return their IDs
  async upsertMany(workspaceId: number, names: string[]): Promise<number[]> {
    if (names.length === 0) return [];
    
    const tagIds: number[] = [];
    const adapter = getDbAdapter();
    
    // Use the adapter's transaction method
    await adapter.transaction(async (txAdapter) => {
      for (const name of names) {
        const tag = await this.upsert(workspaceId, name);
        tagIds.push(tag.id);
      }
    });
    
    return tagIds;
  }

  // Delete unused tags in a workspace
  deleteUnused(workspaceId: number): number {
    const result = this.getDbConnection()
      .prepare(`
        DELETE FROM workspace_tags 
        WHERE workspace_id = ? 
          AND id NOT IN (
            SELECT DISTINCT tag_id FROM document_tags
          )
      `)
      .run(workspaceId);
    
    return result.changes;
  }

  // Get tag usage statistics
  getUsageStats(workspaceId: number): Array<{ tag: Tag; document_count: number }> {
    const rows = this.getDbConnection()
      .prepare(`
        SELECT 
          wt.*,
          COUNT(dt.document_id) as document_count
        FROM workspace_tags wt
        LEFT JOIN document_tags dt ON wt.id = dt.tag_id
        WHERE wt.workspace_id = ?
        GROUP BY wt.id
        ORDER BY document_count DESC, wt.name
      `)
      .all(workspaceId) as any[];
    
    return rows.map(row => ({
      tag: {
        id: row.id,
        workspace_id: row.workspace_id,
        name: row.name,
        created_at: row.created_at
      },
      document_count: row.document_count
    }));
  }

  // Attach a tag to a document by name (workspace-aware)
  async attachToDocument(workspaceId: number, documentId: number, tagName: string): Promise<void> {
    // First, ensure the tag exists in the workspace
    const tag = await this.upsert(workspaceId, tagName);
    
    // Then attach it to the document
    const adapter = getDbAdapter();
    const dbType = getDbType();
    
    if (dbType === 'postgres') {
      await adapter.query('INSERT INTO document_tags (document_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [documentId, tag.id]);
    } else {
      const db = this.getDbConnection();
      db.prepare('INSERT OR IGNORE INTO document_tags (document_id, tag_id) VALUES (?, ?)').run(documentId, tag.id);
    }
  }

  // Remove a tag from a document by name (workspace-aware)
  async removeFromDocument(workspaceId: number, documentId: number, tagName: string): Promise<void> {
    // Find the tag in the workspace
    const tag = await this.getByName(workspaceId, tagName);
    if (!tag) return; // Tag doesn't exist, nothing to remove
    
    // Remove the association
    const adapter = getDbAdapter();
    const dbType = getDbType();
    
    if (dbType === 'postgres') {
      await adapter.query('DELETE FROM document_tags WHERE document_id = $1 AND tag_id = $2', [documentId, tag.id]);
    } else {
      const db = this.getDbConnection();
      db.prepare('DELETE FROM document_tags WHERE document_id = ? AND tag_id = ?').run(documentId, tag.id);
    }
  }
}
