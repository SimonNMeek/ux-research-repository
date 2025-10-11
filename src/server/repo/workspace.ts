import { getDb } from '../../../db/index';
import { getDbAdapter, getDbType } from '../../../db/adapter';

export interface Workspace {
  id: number;
  slug: string;
  name: string;
  organization_id: number;
  created_at: string;
  metadata: Record<string, any>;
}

export class WorkspaceRepo {
  private getDbConnection() {
    return getDb();
  }

  async getBySlug(slug: string): Promise<Workspace | null> {
    const adapter = getDbAdapter();
    const dbType = getDbType();
    
    let row: any;
    if (dbType === 'postgres') {
      const result = await adapter.query('SELECT * FROM workspaces WHERE slug = $1', [slug]);
      row = result.rows[0];
    } else {
      const db = this.getDbConnection();
      row = db.prepare('SELECT * FROM workspaces WHERE slug = ?').get(slug);
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

  listAll(): Workspace[] {
    const rows = this.getDbConnection()
      .prepare('SELECT * FROM workspaces ORDER BY name')
      .all() as any[];
    
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

  /**
   * List workspaces by organization
   */
  listByOrganization(organizationId: number): Workspace[] {
    const rows = this.getDbConnection()
      .prepare('SELECT * FROM workspaces WHERE organization_id = ? ORDER BY name')
      .all(organizationId) as any[];
    
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

  create(data: { 
    slug: string; 
    name: string; 
    organization_id: number;
    metadata?: Record<string, any> 
  }): Workspace {
    const metadata = JSON.stringify(data.metadata || {});
    
    const result = this.getDbConnection()
      .prepare('INSERT INTO workspaces (slug, name, organization_id, metadata) VALUES (?, ?, ?, ?) RETURNING *')
      .get(data.slug, data.name, data.organization_id, metadata) as any;
    
    return {
      ...result,
      metadata: JSON.parse(result.metadata || '{}')
    };
  }

  update(id: number, data: { name?: string; metadata?: Record<string, any> }): Workspace | null {
    const updates: string[] = [];
    const values: any[] = [];
    
    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
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
      .prepare(`UPDATE workspaces SET ${updates.join(', ')} WHERE id = ? RETURNING *`)
      .get(...values) as any;
    
    if (!result) return null;
    
    return {
      ...result,
      metadata: JSON.parse(result.metadata || '{}')
    };
  }

  private getById(id: number): Workspace | null {
    const row = this.getDbConnection()
      .prepare('SELECT * FROM workspaces WHERE id = ?')
      .get(id) as any;
    
    if (!row) return null;
    
    return {
      ...row,
      metadata: JSON.parse(row.metadata || '{}')
    };
  }
}
