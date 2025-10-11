/**
 * PostgreSQL Migration Script
 * Applies all migrations to the PostgreSQL database
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { getPostgresPool } from '../db/postgres';

interface Migration {
  id: number;
  filename: string;
  sql: string;
}

function loadMigrations(): Migration[] {
  const migrationsDir = join(__dirname, '../db/migrations');
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

async function runPostgresMigrations() {
  const pool = getPostgresPool();
  
  try {
    // Create migrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY,
        filename TEXT NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get applied migrations
    const appliedResult = await pool.query('SELECT id FROM migrations');
    const appliedMigrations = new Set(
      appliedResult.rows.map((row: any) => row.id)
    );

    // Load and run pending migrations
    const migrations = loadMigrations();
    let appliedCount = 0;

    for (const migration of migrations) {
      if (appliedMigrations.has(migration.id)) {
        console.log(`⏭️  Skipping already applied migration ${migration.filename}`);
        continue;
      }

      console.log(`🔄 Running migration ${migration.filename}...`);
      
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // Split SQL into individual statements and execute them
        const statements = migration.sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0);

        for (const statement of statements) {
          if (statement.trim()) {
            await client.query(statement);
          }
        }

        // Record the migration as applied
        await client.query(
          'INSERT INTO migrations (id, filename) VALUES ($1, $2)',
          [migration.id, migration.filename]
        );

        await client.query('COMMIT');
        
        appliedCount++;
        console.log(`✅ Applied migration ${migration.filename}`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ Failed to apply migration ${migration.filename}:`, error);
        throw error;
      } finally {
        client.release();
      }
    }

    if (appliedCount === 0) {
      console.log('✅ No pending migrations');
    } else {
      console.log(`✅ Applied ${appliedCount} migration(s)`);
    }
  } finally {
    await pool.end();
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runPostgresMigrations().catch(console.error);
}
