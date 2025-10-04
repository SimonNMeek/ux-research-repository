const { getDb, closeDb } = require('./db/index.ts');
const fs = require('fs');
const path = require('path');

// Read the migration file
const migrationPath = path.join(__dirname, 'db/migrations/001_create_workspaces_and_projects.sql');
const migrationSql = fs.readFileSync(migrationPath, 'utf8');

// Get database and run migration
const db = getDb();
console.log('Running migration...');

try {
  db.exec(migrationSql);
  
  // Insert default workspace data
  const workspaceId = db.prepare(`
    INSERT INTO workspaces (slug, name, metadata) 
    VALUES ('demo-co', 'Farm to Fork App', '{"description": "Main research workspace"}')
    RETURNING id
  `).get().id;
  
  // Insert default project
  const projectId = db.prepare(`
    INSERT INTO projects (workspace_id, slug, name, description, metadata)
    VALUES (?, 'legacy-research', 'Legacy Research', 'Existing research documents', '{}')
    RETURNING id
  `).get(workspaceId).id;
  
  console.log(`✅ Migration complete!`);
  console.log(`- Workspace ID: ${workspaceId}`);
  console.log(`- Project ID: ${projectId}`);
  
} catch (err) {
  console.error('Migration failed:', err);
}

closeDb();
