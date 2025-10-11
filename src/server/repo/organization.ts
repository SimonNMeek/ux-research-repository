import { getDbAdapter, getDbType } from '../../../db/adapter';
import { getDb } from '../../../db/index';

export interface Organization {
  id: number;
  slug: string;
  name: string;
  billing_email: string | null;
  plan: 'free' | 'pro' | 'enterprise';
  max_workspaces: number;
  max_users: number;
  max_documents: number;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
}

export interface OrganizationWithRole extends Organization {
  user_role: 'owner' | 'admin' | 'member';
}

export class OrganizationRepo {
  /**
   * Get organization by slug
   */
  async getBySlug(slug: string): Promise<Organization | null> {
    const adapter = getDbAdapter();
    const dbType = getDbType();
    
    let row: any;
    if (dbType === 'postgres') {
      const result = await adapter.query('SELECT * FROM organizations WHERE slug = $1', [slug]);
      row = result.rows[0];
    } else {
      const db = getDb();
      row = db.prepare('SELECT * FROM organizations WHERE slug = ?').get(slug);
    }
    
    if (!row) return null;
    
    return this.mapRow(row);
  }

  /**
   * Get organization by ID
   */
  async getById(id: number): Promise<Organization | null> {
    const adapter = getDbAdapter();
    const dbType = getDbType();
    
    let row: any;
    if (dbType === 'postgres') {
      const result = await adapter.query('SELECT * FROM organizations WHERE id = $1', [id]);
      row = result.rows[0];
    } else {
      const db = getDb();
      row = db.prepare('SELECT * FROM organizations WHERE id = ?').get(id);
    }
    
    if (!row) return null;
    
    return this.mapRow(row);
  }

  /**
   * List all organizations a user has access to
   */
  async listForUser(userId: number): Promise<OrganizationWithRole[]> {
    const adapter = getDbAdapter();
    const dbType = getDbType();
    
    let rows: any[];
    if (dbType === 'postgres') {
      const result = await adapter.query(`
        SELECT 
          o.*,
          uo.role as user_role
        FROM organizations o
        INNER JOIN user_organizations uo ON o.id = uo.organization_id
        WHERE uo.user_id = $1
        ORDER BY o.name
      `, [userId]);
      rows = result.rows;
    } else {
      const db = getDb();
      rows = db.prepare(`
        SELECT 
          o.*,
          uo.role as user_role
        FROM organizations o
        INNER JOIN user_organizations uo ON o.id = uo.organization_id
        WHERE uo.user_id = ?
        ORDER BY o.name
      `).all(userId);
    }
    
    return rows.map(row => ({
      ...this.mapRow(row),
      user_role: row.user_role
    }));
  }

  /**
   * Create a new organization
   */
  create(data: {
    slug: string;
    name: string;
    billing_email?: string;
    plan?: 'free' | 'pro' | 'enterprise';
    metadata?: Record<string, any>;
  }): Organization {
    const metadata = JSON.stringify(data.metadata || {});
    
    const result = this.db
      .prepare(`
        INSERT INTO organizations (slug, name, billing_email, plan, metadata)
        VALUES (?, ?, ?, ?, ?)
        RETURNING *
      `)
      .get(
        data.slug,
        data.name,
        data.billing_email || null,
        data.plan || 'free',
        metadata
      ) as any;
    
    return this.mapRow(result);
  }

  /**
   * Update organization
   */
  update(id: number, data: {
    name?: string;
    billing_email?: string;
    plan?: 'free' | 'pro' | 'enterprise';
    max_workspaces?: number;
    max_users?: number;
    max_documents?: number;
    metadata?: Record<string, any>;
  }): Organization | null {
    const updates: string[] = [];
    const values: any[] = [];
    
    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    
    if (data.billing_email !== undefined) {
      updates.push('billing_email = ?');
      values.push(data.billing_email);
    }
    
    if (data.plan !== undefined) {
      updates.push('plan = ?');
      values.push(data.plan);
    }
    
    if (data.max_workspaces !== undefined) {
      updates.push('max_workspaces = ?');
      values.push(data.max_workspaces);
    }
    
    if (data.max_users !== undefined) {
      updates.push('max_users = ?');
      values.push(data.max_users);
    }
    
    if (data.max_documents !== undefined) {
      updates.push('max_documents = ?');
      values.push(data.max_documents);
    }
    
    if (data.metadata !== undefined) {
      updates.push('metadata = ?');
      values.push(JSON.stringify(data.metadata));
    }
    
    if (updates.length === 0) {
      return this.getById(id);
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    const result = this.db
      .prepare(`UPDATE organizations SET ${updates.join(', ')} WHERE id = ? RETURNING *`)
      .get(...values) as any;
    
    if (!result) return null;
    
    return this.mapRow(result);
  }

  /**
   * Check if user has access to organization
   */
  hasAccess(userId: number, organizationId: number): boolean {
    const row = this.db
      .prepare(`
        SELECT 1 FROM user_organizations
        WHERE user_id = ? AND organization_id = ?
      `)
      .get(userId, organizationId);
    
    return row !== undefined;
  }

  /**
   * Get user's role in organization
   */
  getUserRole(userId: number, organizationId: number): 'owner' | 'admin' | 'member' | null {
    const row = this.db
      .prepare(`
        SELECT role FROM user_organizations
        WHERE user_id = ? AND organization_id = ?
      `)
      .get(userId, organizationId) as { role: 'owner' | 'admin' | 'member' } | undefined;
    
    return row?.role || null;
  }

  /**
   * Add user to organization
   */
  addUser(organizationId: number, userId: number, role: 'owner' | 'admin' | 'member', invitedBy: number): void {
    this.db
      .prepare(`
        INSERT INTO user_organizations (organization_id, user_id, role, invited_by)
        VALUES (?, ?, ?, ?)
      `)
      .run(organizationId, userId, role, invitedBy);
  }

  /**
   * Remove user from organization
   */
  removeUser(organizationId: number, userId: number): void {
    this.db
      .prepare('DELETE FROM user_organizations WHERE organization_id = ? AND user_id = ?')
      .run(organizationId, userId);
  }

  /**
   * Update user role in organization
   */
  updateUserRole(organizationId: number, userId: number, role: 'owner' | 'admin' | 'member'): void {
    this.db
      .prepare('UPDATE user_organizations SET role = ? WHERE organization_id = ? AND user_id = ?')
      .run(role, organizationId, userId);
  }

  /**
   * List users in organization
   */
  listUsers(organizationId: number): Array<{
    id: number;
    email: string;
    name: string;
    first_name: string | null;
    last_name: string | null;
    role: 'owner' | 'admin' | 'member';
    joined_at: string;
  }> {
    return this.db
      .prepare(`
        SELECT 
          u.id,
          u.email,
          u.name,
          u.first_name,
          u.last_name,
          uo.role,
          uo.joined_at
        FROM users u
        INNER JOIN user_organizations uo ON u.id = uo.user_id
        WHERE uo.organization_id = ?
        ORDER BY u.name
      `)
      .all(organizationId) as any[];
  }

  /**
   * Get organization stats
   */
  getStats(organizationId: number): {
    workspace_count: number;
    user_count: number;
    document_count: number;
  } {
    const stats = this.db
      .prepare(`
        SELECT 
          (SELECT COUNT(*) FROM workspaces WHERE organization_id = ?) as workspace_count,
          (SELECT COUNT(*) FROM user_organizations WHERE organization_id = ?) as user_count,
          (SELECT COUNT(*) FROM documents d 
           INNER JOIN projects p ON d.project_id = p.id
           INNER JOIN workspaces w ON p.workspace_id = w.id
           WHERE w.organization_id = ?) as document_count
      `)
      .get(organizationId, organizationId, organizationId) as any;
    
    return stats;
  }

  /**
   * Check if organization has reached limits
   */
  checkLimits(organizationId: number): {
    can_add_workspace: boolean;
    can_add_user: boolean;
    can_add_document: boolean;
  } {
    const org = this.getById(organizationId);
    if (!org) {
      return { can_add_workspace: false, can_add_user: false, can_add_document: false };
    }

    const stats = this.getStats(organizationId);

    return {
      can_add_workspace: stats.workspace_count < org.max_workspaces,
      can_add_user: stats.user_count < org.max_users,
      can_add_document: stats.document_count < org.max_documents
    };
  }

  private mapRow(row: any): Organization {
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
}

