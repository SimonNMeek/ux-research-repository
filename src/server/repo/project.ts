import { query } from '../../../db/postgres';

export interface Project {
  id: number;
  workspace_id: number;
  slug: string;
  name: string;
  description: string;
  created_at: string;
  metadata: Record<string, any>;
}

function normalizeMetadata(value: any): Record<string, any> {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value;
}

function mapProjectRow(row: any): Project {
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    created_at: row.created_at,
    metadata: normalizeMetadata(row.metadata),
  };
}

export class ProjectRepo {
  async listByWorkspace(workspaceId: number): Promise<Project[]> {
    const result = await query<Project>('SELECT * FROM projects WHERE workspace_id = $1 ORDER BY name', [workspaceId]);
    return result.rows.map(mapProjectRow);
  }

  async listByWorkspaceWithDocumentCounts(workspaceId: number): Promise<(Project & { document_count: number })[]> {
    const result = await query<Project & { document_count: number }>(
      `SELECT p.*, COALESCE(COUNT(d.id), 0) as document_count
       FROM projects p
       LEFT JOIN documents d ON p.id = d.project_id
       WHERE p.workspace_id = $1
       GROUP BY p.id
       ORDER BY p.name`,
      [workspaceId]
    );

    return result.rows.map((row) => ({ ...mapProjectRow(row), document_count: Number(row.document_count) }));
  }

  async getBySlug(workspaceId: number, slug: string): Promise<Project | null> {
    const result = await query<Project>(
      'SELECT * FROM projects WHERE workspace_id = $1 AND slug = $2',
      [workspaceId, slug]
    );
    const row = result.rows[0];
    return row ? mapProjectRow(row) : null;
  }

  async getById(id: number): Promise<Project | null> {
    const result = await query<Project>('SELECT * FROM projects WHERE id = $1', [id]);
    const row = result.rows[0];
    return row ? mapProjectRow(row) : null;
  }

  async create(
    workspaceId: number,
    data: {
      slug: string;
      name: string;
      description?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<Project> {
    const result = await query<Project>(
      `INSERT INTO projects (workspace_id, slug, name, description, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [workspaceId, data.slug, data.name, data.description || '', JSON.stringify(data.metadata || {})]
    );

    return mapProjectRow(result.rows[0]);
  }

  async update(
    id: number,
    data: {
      name?: string;
      description?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<Project | null> {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push(`name = $${values.length + 1}`);
      values.push(data.name);
    }

    if (data.description !== undefined) {
      updates.push(`description = $${values.length + 1}`);
      values.push(data.description);
    }

    if (data.metadata !== undefined) {
      updates.push(`metadata = $${values.length + 1}`);
      values.push(JSON.stringify(data.metadata));
    }

    if (updates.length === 0) {
      return this.getById(id);
    }

    values.push(id);
    const result = await query<Project>(
      `UPDATE projects
       SET ${updates.join(', ')}
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    const row = result.rows[0];
    return row ? mapProjectRow(row) : null;
  }

  async delete(id: number): Promise<boolean> {
    const result = await query('DELETE FROM projects WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async getByIdsInWorkspace(workspaceId: number, projectIds: number[]): Promise<Project[]> {
    if (projectIds.length === 0) return [];
    const placeholders = projectIds.map((_, i) => `$${i + 2}`).join(', ');
    const result = await query<Project>(
      `SELECT * FROM projects WHERE workspace_id = $1 AND id IN (${placeholders})`,
      [workspaceId, ...projectIds]
    );
    return result.rows.map(mapProjectRow);
  }

  async resolveSlugsToIds(workspaceId: number, slugs: string[]): Promise<number[]> {
    if (slugs.length === 0) return [];
    const placeholders = slugs.map((_, i) => `$${i + 2}`).join(', ');
    const result = await query<{ id: number }>(
      `SELECT id FROM projects WHERE workspace_id = $1 AND slug IN (${placeholders})`,
      [workspaceId, ...slugs]
    );
    return result.rows.map((row) => row.id);
  }
}
