import { getDb } from '../../../db/index';
import { getDbAdapter, getDbType } from '../../../db/adapter';

export interface Project {
  id: number;
  workspace_id: number;
  slug: string;
  name: string;
  description: string;
  created_at: string;
  metadata: Record<string, any>;
}

export class ProjectRepo {
  private getDbConnection() {
    return getDb();
  }

  listByWorkspace(workspaceId: number): Project[] {
    const rows = this.getDbConnection()
      .prepare('SELECT * FROM projects WHERE workspace_id = ? ORDER BY name')
      .all(workspaceId) as any[];
    
    return rows.map(row => ({
      ...row,
      metadata: JSON.parse(row.metadata || '{}')
    }));
  }

  listByWorkspaceWithDocumentCounts(workspaceId: number): (Project & { document_count: number })[] {
    const rows = this.getDbConnection()
      .prepare(`
        SELECT p.*, 
               COALESCE(COUNT(d.id), 0) as document_count
        FROM projects p
        LEFT JOIN documents d ON p.id = d.project_id
        WHERE p.workspace_id = ?
        GROUP BY p.id
        ORDER BY p.name
      `)
      .all(workspaceId) as any[];
    
    return rows.map(row => ({
      ...row,
      document_count: row.document_count,
      metadata: JSON.parse(row.metadata || '{}')
    }));
  }

  getBySlug(workspaceId: number, slug: string): Project | null {
    const row = this.getDbConnection()
      .prepare('SELECT * FROM projects WHERE workspace_id = ? AND slug = ?')
      .get(workspaceId, slug) as any;
    
    if (!row) return null;
    
    return {
      ...row,
      metadata: JSON.parse(row.metadata || '{}')
    };
  }

  getById(id: number): Project | null {
    const row = this.getDbConnection()
      .prepare('SELECT * FROM projects WHERE id = ?')
      .get(id) as any;
    
    if (!row) return null;
    
    return {
      ...row,
      metadata: JSON.parse(row.metadata || '{}')
    };
  }

  create(workspaceId: number, data: { 
    slug: string; 
    name: string; 
    description?: string;
    metadata?: Record<string, any>;
  }): Project {
    const metadata = JSON.stringify(data.metadata || {});
    
    const result = this.getDbConnection()
      .prepare(`
        INSERT INTO projects (workspace_id, slug, name, description, metadata) 
        VALUES (?, ?, ?, ?, ?) 
        RETURNING *
      `)
      .get(
        workspaceId,
        data.slug,
        data.name,
        data.description || '',
        metadata
      ) as any;
    
    return {
      ...result,
      metadata: JSON.parse(result.metadata || '{}')
    };
  }

  update(id: number, data: { 
    name?: string; 
    description?: string;
    metadata?: Record<string, any>;
  }): Project | null {
    const updates: string[] = [];
    const values: any[] = [];
    
    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    
    if (data.metadata !== undefined) {
      updates.push('metadata = ?');
      values.push(JSON.stringify(data.metadata));
    }
    
    if (updates.length === 0) {
      return this.getById(id);
    }
    
    values.push(id);
    
    const result = this.getDbConnection()
      .prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ? RETURNING *`)
      .get(...values) as any;
    
    if (!result) return null;
    
    return {
      ...result,
      metadata: JSON.parse(result.metadata || '{}')
    };
  }

  delete(id: number): boolean {
    const result = this.getDbConnection()
      .prepare('DELETE FROM projects WHERE id = ?')
      .run(id);
    
    return result.changes > 0;
  }

  // Get projects by IDs within a workspace (for validation)
  getByIdsInWorkspace(workspaceId: number, projectIds: number[]): Project[] {
    if (projectIds.length === 0) return [];
    
    const placeholders = projectIds.map(() => '?').join(',');
    const rows = this.getDbConnection()
      .prepare(`
        SELECT * FROM projects 
        WHERE workspace_id = ? AND id IN (${placeholders})
      `)
      .all(workspaceId, ...projectIds) as any[];
    
    return rows.map(row => ({
      ...row,
      metadata: JSON.parse(row.metadata || '{}')
    }));
  }

  // Resolve project slugs to IDs within a workspace
  resolveSlugsToids(workspaceId: number, slugs: string[]): number[] {
    if (slugs.length === 0) return [];
    
    const placeholders = slugs.map(() => '?').join(',');
    const rows = this.getDbConnection()
      .prepare(`
        SELECT id FROM projects 
        WHERE workspace_id = ? AND slug IN (${placeholders})
      `)
      .all(workspaceId, ...slugs) as any[];
    
    return rows.map(row => row.id);
  }
}
