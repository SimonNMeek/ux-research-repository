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

  upsert(workspaceId: number, name: string): Tag {
    // Try to get existing tag first
    const existing = this.getDbConnection()
      .prepare('SELECT * FROM workspace_tags WHERE workspace_id = ? AND name = ?')
      .get(workspaceId, name) as any;
    
    if (existing) {
      return existing;
    }
    
    // Create new tag
    const result = this.getDbConnection()
      .prepare('INSERT INTO workspace_tags (workspace_id, name) VALUES (?, ?) RETURNING *')
      .get(workspaceId, name) as any;
    
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

  getByName(workspaceId: number, name: string): Tag | null {
    const row = this.getDbConnection()
      .prepare('SELECT * FROM workspace_tags WHERE workspace_id = ? AND name = ?')
      .get(workspaceId, name) as any;
    
    return row || null;
  }

  // Attach tags to a document
  attach(documentId: number, tagIds: number[]): void {
    if (tagIds.length === 0) return;
    
    // Remove existing tags first
    this.getDbConnection()
      .prepare('DELETE FROM document_tags WHERE document_id = ?')
      .run(documentId);
    
    // Insert new tags
    const insertStmt = this.getDbConnection().prepare('INSERT INTO document_tags (document_id, tag_id) VALUES (?, ?)');
    
    this.getDbConnection().transaction(() => {
      for (const tagId of tagIds) {
        insertStmt.run(documentId, tagId);
      }
    })();
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
  getForDocument(documentId: number): Tag[] {
    const rows = this.getDbConnection()
      .prepare(`
        SELECT wt.* 
        FROM workspace_tags wt
        JOIN document_tags dt ON wt.id = dt.tag_id
        WHERE dt.document_id = ?
        ORDER BY wt.name
      `)
      .all(documentId) as any[];
    
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
  upsertMany(workspaceId: number, names: string[]): number[] {
    if (names.length === 0) return [];
    
    const tagIds: number[] = [];
    
    this.getDbConnection().transaction(() => {
      for (const name of names) {
        const tag = this.upsert(workspaceId, name);
        tagIds.push(tag.id);
      }
    })();
    
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
  attachToDocument(workspaceId: number, documentId: number, tagName: string): void {
    // First, ensure the tag exists in the workspace
    const tag = this.upsert(workspaceId, tagName);
    
    // Then attach it to the document
    this.getDbConnection()
      .prepare('INSERT OR IGNORE INTO document_tags (document_id, tag_id) VALUES (?, ?)')
      .run(documentId, tag.id);
  }

  // Remove a tag from a document by name (workspace-aware)
  removeFromDocument(workspaceId: number, documentId: number, tagName: string): void {
    // Find the tag in the workspace
    const tag = this.getByName(workspaceId, tagName);
    if (!tag) return; // Tag doesn't exist, nothing to remove
    
    // Remove the association
    this.getDbConnection()
      .prepare('DELETE FROM document_tags WHERE document_id = ? AND tag_id = ?')
      .run(documentId, tag.id);
  }
}
