import { getDb } from '../../../db/index';

export interface Workspace {
  id: number;
  slug: string;
  name: string;
  organization_id: number;
  created_at: string;
  metadata: Record<string, any>;
}

export class WorkspaceRepo {
  private db = getDb();

  getBySlug(slug: string): Workspace | null {
    const row = this.db
      .prepare('SELECT * FROM workspaces WHERE slug = ?')
      .get(slug) as any;
    
    if (!row) return null;
    
    return {
      ...row,
      metadata: JSON.parse(row.metadata || '{}')
    };
  }

  listAll(): Workspace[] {
    const rows = this.db
      .prepare('SELECT * FROM workspaces ORDER BY name')
      .all() as any[];
    
    return rows.map(row => ({
      ...row,
      metadata: JSON.parse(row.metadata || '{}')
    }));
  }

  /**
   * List workspaces by organization
   */
  listByOrganization(organizationId: number): Workspace[] {
    const rows = this.db
      .prepare('SELECT * FROM workspaces WHERE organization_id = ? ORDER BY name')
      .all(organizationId) as any[];
    
    return rows.map(row => ({
      ...row,
      metadata: JSON.parse(row.metadata || '{}')
    }));
  }

  create(data: { 
    slug: string; 
    name: string; 
    organization_id: number;
    metadata?: Record<string, any> 
  }): Workspace {
    const metadata = JSON.stringify(data.metadata || {});
    
    const result = this.db
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
    
    const result = this.db
      .prepare(`UPDATE workspaces SET ${updates.join(', ')} WHERE id = ? RETURNING *`)
      .get(...values) as any;
    
    if (!result) return null;
    
    return {
      ...result,
      metadata: JSON.parse(result.metadata || '{}')
    };
  }

  private getById(id: number): Workspace | null {
    const row = this.db
      .prepare('SELECT * FROM workspaces WHERE id = ?')
      .get(id) as any;
    
    if (!row) return null;
    
    return {
      ...row,
      metadata: JSON.parse(row.metadata || '{}')
    };
  }
}
