import { describe, it, expect, beforeAll } from 'vitest';

const BASE_URL = 'http://localhost:3001';

describe('Workspace Isolation', () => {
  beforeAll(async () => {
    // Ensure the server is running and seeded
    const response = await fetch(`${BASE_URL}/w/demo-co/api/workspace`);
    if (!response.ok) {
      throw new Error('Server not running or not seeded. Run: npm run dev && npx tsx scripts/seed.ts');
    }
  });

  describe('Cross-workspace search isolation', () => {
    it('should return different results for "checkout" in different workspaces', async () => {
      // Search in demo-co workspace
      const demoCoResponse = await fetch(`${BASE_URL}/w/demo-co/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: 'checkout', mode: 'fulltext' })
      });
      
      expect(demoCoResponse.ok).toBe(true);
      const demoCoData = await demoCoResponse.json();
      
      // Search in client-x workspace
      const clientXResponse = await fetch(`${BASE_URL}/w/client-x/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: 'checkout', mode: 'fulltext' })
      });
      
      expect(clientXResponse.ok).toBe(true);
      const clientXData = await clientXResponse.json();
      
      // Demo Co should have checkout-related results
      expect(demoCoData.results.length).toBeGreaterThan(0);
      expect(demoCoData.workspace_slug).toBe('demo-co');
      
      // Client X should have no checkout-related results
      expect(clientXData.results.length).toBe(0);
      expect(clientXData.workspace_slug).toBe('client-x');
    });

    it('should return workspace-specific results for "interface"', async () => {
      // Search in demo-co workspace
      const demoCoResponse = await fetch(`${BASE_URL}/w/demo-co/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: 'interface', mode: 'fulltext' })
      });
      
      const demoCoData = await demoCoResponse.json();
      
      // Search in client-x workspace
      const clientXResponse = await fetch(`${BASE_URL}/w/client-x/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: 'interface', mode: 'fulltext' })
      });
      
      const clientXData = await clientXResponse.json();
      
      // Client X should have interface-related results (from prototype testing)
      expect(clientXData.results.length).toBeGreaterThan(0);
      expect(clientXData.workspace_slug).toBe('client-x');
      
      // Results should be different between workspaces
      const demoCoDocIds = demoCoData.results.map(r => r.document_id);
      const clientXDocIds = clientXData.results.map(r => r.document_id);
      
      // No overlap in document IDs (different workspaces)
      const overlap = demoCoDocIds.filter(id => clientXDocIds.includes(id));
      expect(overlap.length).toBe(0);
    });
  });

  describe('Cross-workspace project access prevention', () => {
    it('should reject search with projects from different workspace', async () => {
      const response = await fetch(`${BASE_URL}/w/demo-co/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: 'test',
          projectSlugs: ['discovery', 'market-research'] // discovery is from client-x
        })
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Project not in active workspace');
      expect(data.missing_projects).toContain('discovery');
    });

    it('should allow search with projects from same workspace', async () => {
      const response = await fetch(`${BASE_URL}/w/demo-co/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: 'user',
          projectSlugs: ['market-research', 'product-research'] // both from demo-co
        })
      });
      
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.workspace_slug).toBe('demo-co');
      expect(data.results).toBeDefined();
    });
  });

  describe('Workspace API isolation', () => {
    it('should return correct workspace info for each workspace', async () => {
      // Demo Co workspace
      const demoCoResponse = await fetch(`${BASE_URL}/w/demo-co/api/workspace`);
      expect(demoCoResponse.ok).toBe(true);
      const demoCoData = await demoCoResponse.json();
      expect(demoCoData.slug).toBe('demo-co');
      expect(demoCoData.name).toBe('Demo Co');
      
      // Client X workspace
      const clientXResponse = await fetch(`${BASE_URL}/w/client-x/api/workspace`);
      expect(clientXResponse.ok).toBe(true);
      const clientXData = await clientXResponse.json();
      expect(clientXData.slug).toBe('client-x');
      expect(clientXData.name).toBe('Client X');
    });

    it('should return different projects for each workspace', async () => {
      // Demo Co projects
      const demoCoResponse = await fetch(`${BASE_URL}/w/demo-co/api/projects`);
      expect(demoCoResponse.ok).toBe(true);
      const demoCoData = await demoCoResponse.json();
      const demoCoSlugs = demoCoData.projects.map(p => p.slug);
      expect(demoCoSlugs).toContain('market-research');
      expect(demoCoSlugs).toContain('product-research');
      
      // Client X projects
      const clientXResponse = await fetch(`${BASE_URL}/w/client-x/api/projects`);
      expect(clientXResponse.ok).toBe(true);
      const clientXData = await clientXResponse.json();
      const clientXSlugs = clientXData.projects.map(p => p.slug);
      expect(clientXSlugs).toContain('discovery');
      expect(clientXSlugs).toContain('alpha');
      
      // No overlap in project slugs
      const overlap = demoCoSlugs.filter(slug => clientXSlugs.includes(slug));
      expect(overlap.length).toBe(0);
    });

    it('should return 404 for non-existent workspace', async () => {
      const response = await fetch(`${BASE_URL}/w/non-existent/api/workspace`);
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toContain('not found');
    });
  });

  describe('Tag isolation', () => {
    it('should return different tags for each workspace', async () => {
      // Demo Co tags
      const demoCoResponse = await fetch(`${BASE_URL}/w/demo-co/api/tags`);
      expect(demoCoResponse.ok).toBe(true);
      const demoCoData = await demoCoResponse.json();
      const demoCoTagNames = demoCoData.tags.map(t => t.name);
      
      // Client X tags
      const clientXResponse = await fetch(`${BASE_URL}/w/client-x/api/tags`);
      expect(clientXResponse.ok).toBe(true);
      const clientXData = await clientXResponse.json();
      const clientXTagNames = clientXData.tags.map(t => t.name);
      
      // Demo Co should have checkout-related tags
      expect(demoCoTagNames).toContain('checkout');
      expect(demoCoTagNames).toContain('usability');
      
      // Client X should have different tags
      expect(clientXTagNames).toContain('prototype');
      expect(clientXTagNames).toContain('interface');
      
      // Some tags might overlap (like 'testing'), but workspaces should be isolated
      expect(demoCoData.tags.length).toBeGreaterThan(0);
      expect(clientXData.tags.length).toBeGreaterThan(0);
    });
  });
});
