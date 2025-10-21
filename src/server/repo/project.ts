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

  async listByWorkspace(workspaceId: number): Promise<Project[]> {
    const adapter = getDbAdapter();
    const dbType = getDbType();
    
    let rows: any[];
    if (dbType === 'postgres') {
      const result = await adapter.query('SELECT * FROM projects WHERE workspace_id = $1 ORDER BY name', [workspaceId]);
      rows = result.rows;
    } else {
      rows = adapter.prepare('SELECT * FROM projects WHERE workspace_id = ? ORDER BY name').all(workspaceId);
    }
    
    return rows.map(row => {
      // Handle metadata - PostgreSQL returns JSON objects, SQLite returns strings
      let metadata = {};
      if (row.metadata) {
        if (typeof row.metadata === 'string') {
          metadata = JSON.parse(row.metadata);
        } else {
          metadata = row.metadata;
        }
      }
      
      return {
        ...row,
        metadata
      };
    });
  }

  async listByWorkspaceWithDocumentCounts(workspaceId: number): Promise<(Project & { document_count: number })[]> {
    const adapter = getDbAdapter();
    const dbType = getDbType();
    
    let rows: any[];
    if (dbType === 'postgres') {
      const result = await adapter.query(`
        SELECT p.*, 
               COALESCE(COUNT(d.id), 0) as document_count
        FROM projects p
        LEFT JOIN documents d ON p.id = d.project_id
        WHERE p.workspace_id = $1
        GROUP BY p.id
        ORDER BY p.name
      `, [workspaceId]);
      rows = result.rows;
    } else {
      const db = this.getDbConnection();
      rows = db.prepare(`
        SELECT p.*, 
               COALESCE(COUNT(d.id), 0) as document_count
        FROM projects p
        LEFT JOIN documents d ON p.id = d.project_id
        WHERE p.workspace_id = ?
        GROUP BY p.id
        ORDER BY p.name
      `).all(workspaceId);
    }
    
    return rows.map(row => {
      // Handle metadata - PostgreSQL returns JSON objects, SQLite returns strings
      let metadata = {};
      if (row.metadata) {
        if (typeof row.metadata === 'string') {
          metadata = JSON.parse(row.metadata);
        } else {
          metadata = row.metadata;
        }
      }
      
      return {
        ...row,
        document_count: row.document_count,
        metadata
      };
    });
  }

  async getBySlug(workspaceId: number, slug: string): Promise<Project | null> {
    const adapter = getDbAdapter();
    const dbType = getDbType();
    
    let row: any;
    if (dbType === 'postgres') {
      const result = await adapter.query('SELECT * FROM projects WHERE workspace_id = $1 AND slug = $2', [workspaceId, slug]);
      row = result.rows[0];
    } else {
      const db = this.getDbConnection();
      row = db.prepare('SELECT * FROM projects WHERE workspace_id = ? AND slug = ?').get(workspaceId, slug);
    }
    
    if (!row) return null;
    
    // Handle metadata - PostgreSQL returns JSON objects, SQLite returns strings
    let metadata = {};
    if (row.metadata) {
      if (typeof row.metadata === 'string') {
        metadata = JSON.parse(row.metadata);
      } else {
        metadata = row.metadata;
      }
    }
    
    return {
      ...row,
      metadata
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

  async create(workspaceId: number, data: { 
    slug: string; 
    name: string; 
    description?: string;
    metadata?: Record<string, any>;
  }): Promise<Project> {
    const adapter = getDbAdapter();
    const dbType = getDbType();
    const metadata = JSON.stringify(data.metadata || {});
    
    let result: any;
    if (dbType === 'postgres') {
      const queryResult = await adapter.query(`
        INSERT INTO projects (workspace_id, slug, name, description, metadata) 
        VALUES ($1, $2, $3, $4, $5) 
        RETURNING *
      `, [
        workspaceId,
        data.slug,
        data.name,
        data.description || '',
        metadata
      ]);
      result = queryResult.rows[0];
    } else {
      const db = this.getDbConnection();
      result = db
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
        );
    }
    
    // Handle metadata - PostgreSQL returns JSON objects, SQLite returns strings
    let parsedMetadata = {};
    if (result.metadata) {
      if (typeof result.metadata === 'string') {
        parsedMetadata = JSON.parse(result.metadata);
      } else {
        parsedMetadata = result.metadata;
      }
    }
    
    return {
      ...result,
      metadata: parsedMetadata
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
    
    const adapter = getDbAdapter();
    const dbType = getDbType();
    
    if (dbType === 'postgres') {
      const placeholders = slugs.map((_, i) => `$${i + 2}`).join(',');
      const result = adapter.query(`
        SELECT id FROM projects 
        WHERE workspace_id = $1 AND slug IN (${placeholders})
      `, [workspaceId, ...slugs]);
      return result.rows.map(row => row.id);
    } else {
      const placeholders = slugs.map(() => '?').join(',');
      const rows = adapter.prepare(`
        SELECT id FROM projects 
        WHERE workspace_id = ? AND slug IN (${placeholders})
      `).all(workspaceId, ...slugs) as any[];
      return rows.map(row => row.id);
    }
  }
}
