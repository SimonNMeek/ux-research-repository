import { query } from '../../../db/postgres';

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
  private mapRow(row: any): Organization {
    let metadata: Record<string, any> = {};
    if (row.metadata) {
      if (typeof row.metadata === 'string') {
        try {
          metadata = JSON.parse(row.metadata);
        } catch {
          metadata = {};
        }
      } else {
        metadata = row.metadata;
      }
    }

    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      billing_email: row.billing_email ?? null,
      plan: row.plan,
      max_workspaces: Number(row.max_workspaces ?? 0),
      max_users: Number(row.max_users ?? 0),
      max_documents: Number(row.max_documents ?? 0),
      created_at: row.created_at,
      updated_at: row.updated_at,
      metadata,
    };
  }

  async getBySlug(slug: string): Promise<Organization | null> {
    const result = await query<Organization>(
      'SELECT * FROM organizations WHERE slug = $1',
      [slug]
    );
    const row = result.rows[0];
    return row ? this.mapRow(row) : null;
  }

  async getById(id: number): Promise<Organization | null> {
    const result = await query<Organization>(
      'SELECT * FROM organizations WHERE id = $1',
      [id]
    );
    const row = result.rows[0];
    return row ? this.mapRow(row) : null;
  }

  async listForUser(userId: number): Promise<OrganizationWithRole[]> {
    const result = await query<Organization & { user_role: 'owner' | 'admin' | 'member' }>(
      `SELECT o.*, uo.role as user_role
       FROM organizations o
       INNER JOIN user_organizations uo ON o.id = uo.organization_id
       WHERE uo.user_id = $1
       ORDER BY o.name`,
      [userId]
    );

    return result.rows.map(row => ({
      ...this.mapRow(row),
      user_role: row.user_role,
    }));
  }

  async create(data: {
    slug: string;
    name: string;
    billing_email?: string;
    plan?: 'free' | 'pro' | 'enterprise';
    metadata?: Record<string, any>;
  }): Promise<Organization> {
    const result = await query<Organization>(
      `INSERT INTO organizations (slug, name, billing_email, plan, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        data.slug,
        data.name,
        data.billing_email || null,
        data.plan || 'free',
        JSON.stringify(data.metadata || {}),
      ]
    );

    return this.mapRow(result.rows[0]);
  }

  async update(
    id: number,
    data: {
      name?: string;
      slug?: string;
      billing_email?: string;
      plan?: 'free' | 'pro' | 'enterprise';
      max_workspaces?: number;
      max_users?: number;
      max_documents?: number;
      metadata?: Record<string, any>;
    }
  ): Promise<Organization | null> {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push(`name = $${values.length + 1}`);
      values.push(data.name);
    }

    if (data.slug !== undefined) {
      updates.push(`slug = $${values.length + 1}`);
      values.push(data.slug);
    }

    if (data.billing_email !== undefined) {
      updates.push(`billing_email = $${values.length + 1}`);
      values.push(data.billing_email);
    }

    if (data.plan !== undefined) {
      updates.push(`plan = $${values.length + 1}`);
      values.push(data.plan);
    }

    if (data.max_workspaces !== undefined) {
      updates.push(`max_workspaces = $${values.length + 1}`);
      values.push(data.max_workspaces);
    }

    if (data.max_users !== undefined) {
      updates.push(`max_users = $${values.length + 1}`);
      values.push(data.max_users);
    }

    if (data.max_documents !== undefined) {
      updates.push(`max_documents = $${values.length + 1}`);
      values.push(data.max_documents);
    }

    if (data.metadata !== undefined) {
      updates.push(`metadata = $${values.length + 1}`);
      values.push(JSON.stringify(data.metadata));
    }

    if (updates.length === 0) {
      return await this.getById(id);
    }

    values.push(id);

    const result = await query<Organization>(
      `UPDATE organizations
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    const row = result.rows[0];
    return row ? this.mapRow(row) : null;
  }

  async addUser(
    organizationId: number,
    userId: number,
    role: 'owner' | 'admin' | 'member',
    invitedBy: number
  ): Promise<void> {
    await query(
      `INSERT INTO user_organizations (organization_id, user_id, role, invited_by)
       VALUES ($1, $2, $3, $4)`,
      [organizationId, userId, role, invitedBy]
    );
  }

  async removeUser(organizationId: number, userId: number): Promise<void> {
    await query(
      `DELETE FROM user_organizations WHERE organization_id = $1 AND user_id = $2`,
      [organizationId, userId]
    );
  }

  async updateUserRole(
    organizationId: number,
    userId: number,
    role: 'owner' | 'admin' | 'member'
  ): Promise<void> {
    await query(
      `UPDATE user_organizations SET role = $1 WHERE organization_id = $2 AND user_id = $3`,
      [role, organizationId, userId]
    );
  }

  async delete(id: number): Promise<void> {
    await query('DELETE FROM user_organizations WHERE organization_id = $1', [id]);
    await query('DELETE FROM organizations WHERE id = $1', [id]);
  }

  async listUsers(organizationId: number): Promise<
    Array<{
      id: number;
      email: string;
      name: string;
      first_name: string | null;
      last_name: string | null;
      role: 'owner' | 'admin' | 'member';
      joined_at: string;
    }>
  > {
    const result = await query(
      `SELECT u.id, u.email, u.name, u.first_name, u.last_name, uo.role, uo.joined_at
       FROM users u
       INNER JOIN user_organizations uo ON u.id = uo.user_id
       WHERE uo.organization_id = $1
       ORDER BY u.name`,
      [organizationId]
    );

    return result.rows as Array<{
      id: number;
      email: string;
      name: string;
      first_name: string | null;
      last_name: string | null;
      role: 'owner' | 'admin' | 'member';
      joined_at: string;
    }>;
  }

  async getStats(organizationId: number): Promise<{
    workspace_count: number;
    user_count: number;
    document_count: number;
  }> {
    const result = await query<{
      workspace_count: string;
      user_count: string;
      document_count: string;
    }>(
      `SELECT 
         (SELECT COUNT(*) FROM workspaces WHERE organization_id = $1) as workspace_count,
         (SELECT COUNT(*) FROM user_organizations WHERE organization_id = $1) as user_count,
         (SELECT COUNT(*) FROM documents d
            INNER JOIN projects p ON d.project_id = p.id
            INNER JOIN workspaces w ON p.workspace_id = w.id
            WHERE w.organization_id = $1) as document_count`,
      [organizationId]
    );

    const row = result.rows[0];
    return {
      workspace_count: Number(row.workspace_count ?? 0),
      user_count: Number(row.user_count ?? 0),
      document_count: Number(row.document_count ?? 0),
    };
  }

  async checkLimits(organizationId: number): Promise<{
    can_add_workspace: boolean;
    can_add_user: boolean;
    can_add_document: boolean;
  }> {
    const org = await this.getById(organizationId);
    if (!org) {
      return {
        can_add_workspace: false,
        can_add_user: false,
        can_add_document: false,
      };
    }

    const stats = await this.getStats(organizationId);

    return {
      can_add_workspace: stats.workspace_count < org.max_workspaces,
      can_add_user: stats.user_count < org.max_users,
      can_add_document: stats.document_count < org.max_documents,
    };
  }
}

