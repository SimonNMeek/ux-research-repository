import { query } from '../../../db/postgres';

export interface Workspace {
  id: number;
  slug: string;
  name: string;
  organization_id: number;
  created_at: string;
  metadata: Record<string, any>;
}

export class WorkspaceRepo {
  private normalizeMetadata(row: any): Record<string, any> {
    if (!row?.metadata) return {};
    if (typeof row.metadata === 'string') {
      try {
        return JSON.parse(row.metadata);
      } catch {
        return {};
      }
    }
    return row.metadata;
  }

  private mapRow(row: any): Workspace {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      organization_id: row.organization_id,
      created_at: row.created_at,
      metadata: this.normalizeMetadata(row),
    };
  }

  async getBySlug(slug: string): Promise<Workspace | null> {
    const result = await query<Workspace>('SELECT * FROM workspaces WHERE slug = $1', [slug]);
    const row = result.rows[0];
    if (!row) return null;
    return this.mapRow(row);
  }

  async listAll(): Promise<Workspace[]> {
    const result = await query<Workspace>('SELECT * FROM workspaces ORDER BY name');
    return result.rows.map((row) => this.mapRow(row));
  }

  async listByOrganization(organizationId: number): Promise<Workspace[]> {
    const result = await query<Workspace>(
      'SELECT * FROM workspaces WHERE organization_id = $1 ORDER BY name',
      [organizationId]
    );
    return result.rows.map((row) => this.mapRow(row));
  }

  async create(data: {
    slug: string;
    name: string;
    organization_id: number;
    metadata?: Record<string, any>;
  }): Promise<Workspace> {
    const result = await query<Workspace>(
      `INSERT INTO workspaces (slug, name, organization_id, metadata)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.slug, data.name, data.organization_id, JSON.stringify(data.metadata || {})]
    );
    return this.mapRow(result.rows[0]);
  }

  async update(id: number, data: { name?: string; metadata?: Record<string, any> }): Promise<Workspace | null> {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push(`name = $${values.length + 1}`);
      values.push(data.name);
    }

    if (data.metadata !== undefined) {
      updates.push(`metadata = $${values.length + 1}`);
      values.push(JSON.stringify(data.metadata));
    }

    if (updates.length === 0) {
      return this.getById(id);
    }

    values.push(id);
    const result = await query<Workspace>(
      `UPDATE workspaces
       SET ${updates.join(', ')}
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    const row = result.rows[0];
    if (!row) return null;
    return this.mapRow(row);
  }

  private async getById(id: number): Promise<Workspace | null> {
    const result = await query<Workspace>('SELECT * FROM workspaces WHERE id = $1', [id]);
    const row = result.rows[0];
    if (!row) return null;
    return this.mapRow(row);
  }
}
