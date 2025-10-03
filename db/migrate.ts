import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { getDb } from './index';

interface Migration {
  id: number;
  filename: string;
  sql: string;
}

export function loadMigrations(): Migration[] {
  const migrationsDir = join(__dirname, 'migrations');
  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  return files.map(filename => {
    const match = filename.match(/^(\d+)_/);
    if (!match) {
      throw new Error(`Invalid migration filename: ${filename}`);
    }
    
    const id = parseInt(match[1], 10);
    const sql = readFileSync(join(migrationsDir, filename), 'utf-8');
    
    return { id, filename, sql };
  });
}

export function runMigrations() {
  const db = getDb();
  
  // Create migrations table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY,
      filename TEXT NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Get applied migrations
  const appliedMigrations = new Set(
    db.prepare('SELECT id FROM migrations').all().map((row: any) => row.id)
  );

  // Load and run pending migrations
  const migrations = loadMigrations();
  let appliedCount = 0;

  for (const migration of migrations) {
    if (appliedMigrations.has(migration.id)) {
      continue;
    }

    console.log(`Running migration ${migration.filename}...`);
    
    try {
      // Run migration in transaction
      db.transaction(() => {
        db.exec(migration.sql);
        db.prepare('INSERT INTO migrations (id, filename) VALUES (?, ?)').run(
          migration.id,
          migration.filename
        );
      })();
      
      appliedCount++;
      console.log(`✓ Applied migration ${migration.filename}`);
    } catch (error) {
      console.error(`✗ Failed to apply migration ${migration.filename}:`, error);
      throw error;
    }
  }

  if (appliedCount === 0) {
    console.log('No pending migrations');
  } else {
    console.log(`Applied ${appliedCount} migration(s)`);
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations();
}
