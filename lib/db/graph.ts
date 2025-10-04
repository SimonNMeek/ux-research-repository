import { getDb } from '../../db/index';

export interface GraphNode {
  id: string;
  type: 'document' | 'tag' | 'project' | 'sol';
  label: string;
  projectSlug?: string;
  favorite?: boolean;
  created_at?: string;
}

export interface GraphLink {
  source: string;
  target: string;
  kind: 'TAGGED_WITH' | 'IN_PROJECT' | 'ORBITS';
}

export interface GraphResponse {
  nodes: GraphNode[];
  links: GraphLink[];
  meta: {
    workspace: { id: number; slug: string; name: string };
    counts: { documents: number; tags: number; projects: number };
    filters: { project?: string; tags?: string[]; q?: string; favorites?: boolean };
    capped?: boolean;
  };
}

export interface GraphFilters {
  workspaceId: number;
  projectSlug?: string;
  tags?: string[];
  q?: string;
  favorites?: boolean;
}

export function getWorkspaceBySlug(slug: string): { id: number; slug: string; name: string } | null {
  const db = getDb();
  
  const workspace = db
    .prepare('SELECT id, slug, name FROM workspaces WHERE slug = ?')
    .get(slug) as any;
  
  return workspace || null;
}

export function fetchGraph(filters: GraphFilters): GraphResponse {
  const db = getDb();
  const { workspaceId, projectSlug, tags, q, favorites } = filters;
  
  // Build base document query
  let documentQuery = `
    SELECT DISTINCT d.id, d.title, d.is_favorite, d.created_at, p.slug as project_slug
    FROM documents d
    JOIN projects p ON p.id = d.project_id
    WHERE p.workspace_id = ?
  `;
  
  const params: any[] = [workspaceId];
  let paramIndex = 1;
  
  // Apply filters
  if (projectSlug) {
    documentQuery += ` AND p.slug = ?`;
    params.push(projectSlug);
    paramIndex++;
  }
  
  if (favorites) {
    documentQuery += ` AND d.is_favorite = 1`;
  }
  
  if (q) {
    // Use FTS if available, otherwise fallback to LIKE
    documentQuery += ` AND (
      d.title LIKE ? OR 
      d.body LIKE ? OR 
      d.clean_text LIKE ?
    )`;
    const searchTerm = `%${q}%`;
    params.push(searchTerm);
    params.push(searchTerm);
    params.push(searchTerm);
  }
  
  if (tags && tags.length > 0) {
    // Tag intersection (AND logic) - docs must have ALL selected tags
    const tagPlaceholders = tags.map(() => '?').join(',');
    documentQuery += ` AND d.id IN (
      SELECT dt.document_id
      FROM document_tags dt
      JOIN workspace_tags t ON t.id = dt.tag_id
      WHERE t.name IN (${tagPlaceholders}) AND t.workspace_id = ?
      GROUP BY dt.document_id
      HAVING COUNT(DISTINCT t.name) = ?
    )`;
    params.push(...tags);
    params.push(workspaceId);
    params.push(tags.length);
  }
  
  // Execute document query
  const documents = db.prepare(documentQuery).all(...params) as any[];
  
  // Limit documents to prevent overwhelming the graph
  const MAX_DOCUMENTS = 2000;
  const MAX_TAGS = 500;
  const capped = documents.length > MAX_DOCUMENTS;
  const limitedDocuments = capped ? documents.slice(0, MAX_DOCUMENTS) : documents;
  
  const documentIds = limitedDocuments.map(d => d.id);
  
  // Get projects that have documents (to show in graph)
  const projects = db
    .prepare(`
      SELECT DISTINCT p.id, p.name, p.slug
      FROM projects p
      JOIN documents d ON d.project_id = p.id
      WHERE p.workspace_id = ?
      ${documentIds.length > 0 ? `AND d.id IN (${documentIds.map(() => '?').join(',')})` : ''}
    `)
    .all(...(documentIds.length > 0 ? [workspaceId, ...documentIds] : [workspaceId])) as any[];
  
  const projectList = Array.isArray(projects) ? projects : [projects].filter(Boolean);
  
  // Get tags used by documents
  const tagList = documentIds.length > 0 
    ? db.prepare(`
        SELECT DISTINCT t.id, t.name
        FROM workspace_tags t
        JOIN document_tags dt ON dt.tag_id = t.id
        WHERE t.workspace_id = ? AND dt.document_id IN (${documentIds.map(() => '?').join(',')})
        LIMIT ?
      `).all(workspaceId, ...documentIds, MAX_TAGS) as any[]
    : [];
  
  // Build nodes
  const nodes: GraphNode[] = [
    { id: 'sol', type: 'sol', label: 'Sol' }
  ];
  
  // Add project nodes
  projectList.forEach(project => {
    nodes.push({
      id: `proj:${project.id}`,
      type: 'project',
      label: project.name,
      projectSlug: project.slug
    });
  });
  
  // Add document nodes
  limitedDocuments.forEach(doc => {
    nodes.push({
      id: `doc:${doc.id}`,
      type: 'document',
      label: doc.title,
      projectSlug: doc.project_slug,
      favorite: doc.is_favorite,
      created_at: doc.created_at
    });
  });
  
  // Add tag nodes
  tagList.forEach(tag => {
    nodes.push({
      id: `tag:${tag.id}`,
      type: 'tag',
      label: tag.name
    });
  });
  
  // Build links
  const links: GraphLink[] = [];
  
  // Sol → Projects
  projectList.forEach(project => {
    links.push({
      source: 'sol',
      target: `proj:${project.id}`,
      kind: 'ORBITS'
    });
  });
  
  // Projects → Documents
  limitedDocuments.forEach(doc => {
    const project = projectList.find(p => p.slug === doc.project_slug);
    if (project) {
      links.push({
        source: `proj:${project.id}`,
        target: `doc:${doc.id}`,
        kind: 'IN_PROJECT'
      });
    }
  });
  
  // Documents → Tags
  if (documentIds.length > 0 && tagList.length > 0) {
    const allTagIds = tagList.map(t => t.id);
    const docTagQuery = `
      SELECT dt.document_id, dt.tag_id, t.name
      FROM document_tags dt
      JOIN workspace_tags t ON t.id = dt.tag_id
      WHERE dt.document_id IN (${documentIds.map(() => '?').join(',')}) 
      AND t.id IN (${allTagIds.map(() => '?').join(',')})
    `;
    
    const docTags = db.prepare(docTagQuery).all(...documentIds, ...allTagIds) as any[];
    
    docTags.forEach(docTag => {
      links.push({
        source: `doc:${docTag.document_id}`,
        target: `tag:${docTag.tag_id}`,
        kind: 'TAGGED_WITH'
      });
    });
  }
  
  // Get workspace info
  const workspace = db
    .prepare('SELECT id, slug, name FROM workspaces WHERE id = ?')
    .get(workspaceId) as any;
  
  return {
    nodes,
    links,
    meta: {
      workspace,
      counts: {
        documents: documents.length,
        tags: tagList.length,
        projects: projectList.length
      },
      filters: {
        project: projectSlug,
        tags,
        q,
        favorites
      },
      capped
    }
  };
  }
