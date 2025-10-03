#!/usr/bin/env tsx

import { getDb } from '../db/index';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const db = getDb();

console.log('🔄 Starting migration of existing data to multi-project structure...');

// First, run the new migrations
console.log('📋 Running new migrations...');

// Check existing migrations table structure
const existingMigrations = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='migrations'").get();

if (existingMigrations) {
  // Check if it has the old structure (filename column)
  const hasFilenameColumn = db.prepare("PRAGMA table_info(migrations)").all().some((col: any) => col.name === 'filename');
  
  if (hasFilenameColumn) {
    // Rename old table and create new one
    db.exec(`
      ALTER TABLE migrations RENAME TO migrations_old;
      CREATE TABLE migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      INSERT INTO migrations (name, applied_at) 
      SELECT filename, applied_at FROM migrations_old;
      DROP TABLE migrations_old;
    `);
  }
} else {
  // Create new migrations table
  db.exec(`
    CREATE TABLE migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// Run the workspace migration
const migrationPath = join(__dirname, '..', 'db', 'migrations', '001_create_workspaces_and_projects.sql');
const migrationName = '001_create_workspaces_and_projects.sql';

const isApplied = db.prepare('SELECT 1 FROM migrations WHERE name = ?').get(migrationName);

if (!isApplied) {
  console.log(`Running migration ${migrationName}...`);
  const sql = readFileSync(migrationPath, 'utf-8');
  db.exec(sql);
  db.prepare('INSERT INTO migrations (name) VALUES (?)').run(migrationName);
  console.log(`✓ Applied migration ${migrationName}`);
} else {
  console.log(`- Migration ${migrationName} already applied`);
}

// Check if we have existing notes to migrate
const existingNotesCount = db.prepare('SELECT COUNT(*) as count FROM notes').get() as { count: number };
console.log(`📊 Found ${existingNotesCount.count} existing notes to migrate`);

if (existingNotesCount.count > 0) {
  console.log('🏢 Creating Demo Co workspace and projects...');
  
  // Create Demo Co workspace (if it doesn't exist)
  const existingWorkspace = db.prepare('SELECT id FROM workspaces WHERE slug = ?').get('demo-co') as { id: number } | undefined;
  let workspaceId: number;
  
  if (existingWorkspace) {
    workspaceId = existingWorkspace.id;
    console.log('- Demo Co workspace already exists');
  } else {
    const workspaceResult = db.prepare('INSERT INTO workspaces (slug, name, metadata) VALUES (?, ?, ?)').run(
      'demo-co',
      'Demo Co',
      JSON.stringify({ description: 'Your existing research repository' })
    );
    workspaceId = workspaceResult.lastInsertRowid as number;
    console.log('✓ Created Demo Co workspace');
  }
  
  // Create a "legacy-research" project for existing notes
  const existingProject = db.prepare('SELECT id FROM projects WHERE workspace_id = ? AND slug = ?').get(workspaceId, 'legacy-research') as { id: number } | undefined;
  let projectId: number;
  
  if (existingProject) {
    projectId = existingProject.id;
    console.log('- Legacy Research project already exists');
  } else {
    const projectResult = db.prepare('INSERT INTO projects (workspace_id, slug, name, description, metadata) VALUES (?, ?, ?, ?, ?)').run(
      workspaceId,
      'legacy-research',
      'Legacy Research',
      'Migrated research documents from the original repository',
      JSON.stringify({})
    );
    projectId = projectResult.lastInsertRowid as number;
    console.log('✓ Created Legacy Research project');
  }
  
  console.log('📄 Migrating existing notes to documents...');
  
  // Get all existing notes
  const existingNotes = db.prepare(`
    SELECT id, filename, content, original_text, clean_text, created_at, is_favorite, 
           anonymization_profile_id, clean_version
    FROM notes
  `).all() as Array<{
    id: number;
    filename: string;
    content: string;
    original_text: string | null;
    clean_text: string | null;
    created_at: string;
    is_favorite: number;
    anonymization_profile_id: string | null;
    clean_version: number;
  }>;
  
  // Check if documents already exist (avoid duplicates)
  const existingDocuments = db.prepare('SELECT COUNT(*) as count FROM documents WHERE project_id = ?').get(projectId) as { count: number };
  
  if (existingDocuments.count === 0) {
    // Migrate notes to documents
    const insertDocument = db.prepare(`
      INSERT INTO documents (
        project_id, title, body, created_at, original_text, clean_text, 
        anonymization_profile_id, clean_version, is_favorite
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const noteToDocumentMap = new Map<number, number>();
    
    for (const note of existingNotes) {
      const result = insertDocument.run(
        projectId,
        note.filename,
        note.content,
        note.created_at,
        note.original_text,
        note.clean_text,
        note.anonymization_profile_id,
        note.clean_version,
        note.is_favorite
      );
      noteToDocumentMap.set(note.id, result.lastInsertRowid as number);
    }
    
    console.log(`✓ Migrated ${existingNotes.length} notes to documents`);
    
    console.log('🏷️ Migrating tags...');
    
    // Get all existing tags
    const existingTags = db.prepare('SELECT id, name FROM tags').all() as Array<{ id: number; name: string }>;
    
    // Create workspace tags
    const insertWorkspaceTag = db.prepare('INSERT OR IGNORE INTO workspace_tags (workspace_id, name) VALUES (?, ?)');
    const getWorkspaceTagId = db.prepare('SELECT id FROM workspace_tags WHERE workspace_id = ? AND name = ?');
    
    const tagMap = new Map<number, number>();
    
    for (const tag of existingTags) {
      insertWorkspaceTag.run(workspaceId, tag.name);
      const workspaceTag = getWorkspaceTagId.get(workspaceId, tag.name) as { id: number };
      tagMap.set(tag.id, workspaceTag.id);
    }
    
    console.log(`✓ Migrated ${existingTags.length} tags to workspace tags`);
    
    console.log('🔗 Migrating tag associations...');
    
    // Get all existing note-tag associations
    const existingNoteTags = db.prepare('SELECT note_id, tag_id FROM note_tags').all() as Array<{ note_id: number; tag_id: number }>;
    
    // Create document-tag associations
    const insertDocumentTag = db.prepare('INSERT OR IGNORE INTO document_tags (document_id, tag_id) VALUES (?, ?)');
    
    for (const noteTag of existingNoteTags) {
      const documentId = noteToDocumentMap.get(noteTag.note_id);
      const workspaceTagId = tagMap.get(noteTag.tag_id);
      
      if (documentId && workspaceTagId) {
        insertDocumentTag.run(documentId, workspaceTagId);
      }
    }
    
    console.log(`✓ Migrated ${existingNoteTags.length} tag associations`);
  } else {
    console.log('- Documents already migrated, skipping...');
  }
}

// Create additional demo projects if they don't exist
console.log('🎯 Creating additional demo projects...');

const demoProjects = [
  {
    slug: 'market-research',
    name: 'Market Research',
    description: 'Understanding market trends and competitive landscape'
  },
  {
    slug: 'product-research',
    name: 'Product Research', 
    description: 'User experience and product validation studies'
  }
];

const workspaceId = db.prepare('SELECT id FROM workspaces WHERE slug = ?').get('demo-co') as { id: number } | undefined;

if (workspaceId) {
  for (const project of demoProjects) {
    const existing = db.prepare('SELECT id FROM projects WHERE workspace_id = ? AND slug = ?').get(workspaceId.id, project.slug);
    if (!existing) {
      db.prepare('INSERT INTO projects (workspace_id, slug, name, description, metadata) VALUES (?, ?, ?, ?, ?)').run(
        workspaceId.id,
        project.slug,
        project.name,
        project.description,
        JSON.stringify({})
      );
      console.log(`✓ Created ${project.name} project`);
    } else {
      console.log(`- ${project.name} project already exists`);
    }
  }
}

// Create Client X workspace if it doesn't exist
console.log('🏢 Creating Client X workspace...');

const clientXWorkspace = db.prepare('SELECT id FROM workspaces WHERE slug = ?').get('client-x') as { id: number } | undefined;
let clientXWorkspaceId: number;

if (clientXWorkspace) {
  clientXWorkspaceId = clientXWorkspace.id;
  console.log('- Client X workspace already exists');
} else {
  const result = db.prepare('INSERT INTO workspaces (slug, name, metadata) VALUES (?, ?, ?)').run(
    'client-x',
    'Client X',
    JSON.stringify({ description: 'Client project workspace' })
  );
  clientXWorkspaceId = result.lastInsertRowid as number;
  console.log('✓ Created Client X workspace');
}

// Create Client X projects
const clientXProjects = [
  {
    slug: 'discovery',
    name: 'Discovery Phase',
    description: 'Initial user research and market analysis'
  },
  {
    slug: 'alpha',
    name: 'Alpha Testing',
    description: 'Early prototype testing and validation'
  }
];

for (const project of clientXProjects) {
  const existing = db.prepare('SELECT id FROM projects WHERE workspace_id = ? AND slug = ?').get(clientXWorkspaceId, project.slug);
  if (!existing) {
    db.prepare('INSERT INTO projects (workspace_id, slug, name, description, metadata) VALUES (?, ?, ?, ?, ?)').run(
      clientXWorkspaceId,
      project.slug,
      project.name,
      project.description,
      JSON.stringify({})
    );
    console.log(`✓ Created ${project.name} project for Client X`);
  } else {
    console.log(`- ${project.name} project already exists for Client X`);
  }
}

console.log('✅ Migration completed successfully!');
console.log('');
console.log('📊 Summary:');
console.log(`- Farm to Fork App workspace: Contains your existing ${existingNotesCount.count} research documents`);
console.log('- Legacy Research project: All your original notes and tags');
console.log('- Market Research & Product Research projects: Ready for new content');
console.log('- Client X workspace: Separate workspace for client work');
console.log('');
console.log('🌐 Access your research at:');
console.log('- Workspace selector: http://localhost:3001/workspaces');
console.log('- Farm to Fork App (your data): http://localhost:3001/w/demo-co/search');
console.log('- Client X: http://localhost:3001/w/client-x/search');
