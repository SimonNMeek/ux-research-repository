/**
 * SQLite to PostgreSQL Migration Script
 * Migrates all data from SQLite to PostgreSQL
 * 
 * Usage:
 * 1. Set DATABASE_URL environment variable to your Postgres connection string
 * 2. Run: DATABASE_URL=your-postgres-url npx tsx scripts/migrate-to-postgres.ts
 */

import { getDb as getSqliteDb } from '../db/index';
import { Pool } from 'pg';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

async function migrateData() {
  console.log('🔄 SQLite → PostgreSQL Migration Tool\n');
  console.log('=' .repeat(60));

  // Check DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ ERROR: DATABASE_URL environment variable is required');
    console.error('   Example: DATABASE_URL=postgresql://user:pass@host:5432/db npm run migrate');
    process.exit(1);
  }

  console.log(`\n📊 Source: SQLite (db/data.sqlite)`);
  console.log(`📊 Target: PostgreSQL (${databaseUrl.split('@')[1]?.split('/')[0] || 'hidden'})`);

  // Confirm
  const confirm = await question('\n⚠️  This will REPLACE all data in PostgreSQL. Continue? (yes/no): ');
  if (confirm.toLowerCase() !== 'yes') {
    console.log('Migration cancelled.');
    process.exit(0);
  }

  try {
    // Connect to databases
    console.log('\n🔌 Connecting to databases...');
    const sqliteDb = getSqliteDb();
    const pgPool = new Pool({ connectionString: databaseUrl });

    // Test Postgres connection
    await pgPool.query('SELECT 1');
    console.log('✅ Connected to PostgreSQL');

    // Start migration
    console.log('\n🚀 Starting migration...\n');

    const tables = [
      'users',
      'user_sessions',
      'organizations',
      'user_organizations',
      'workspaces',
      'user_workspaces',
      'projects',
      'documents',
      'workspace_tags',
      'document_tags',
      'anonymization_profiles',
      'pseudonyms',
      'anonymization_audit',
      'searches',
      'user_preferences'
    ];

    let totalRows = 0;

    for (const table of tables) {
      try {
        // Check if table exists in SQLite
        const exists = sqliteDb.prepare(
          `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
        ).get(table);

        if (!exists) {
          console.log(`⏭️  Skipping ${table} (doesn't exist in SQLite)`);
          continue;
        }

        // Get data from SQLite
        const rows = sqliteDb.prepare(`SELECT * FROM ${table}`).all();
        
        if (rows.length === 0) {
          console.log(`⏭️  Skipping ${table} (empty)`);
          continue;
        }

        console.log(`📦 Migrating ${table}...`);

        // Clear existing data in Postgres
        await pgPool.query(`TRUNCATE TABLE ${table} CASCADE`);

        // Get column names
        const columns = Object.keys(rows[0]);
        
        // Prepare insert statement
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const insertSql = `
          INSERT INTO ${table} (${columns.join(', ')})
          VALUES (${placeholders})
        `;

        // Insert data
        for (const row of rows) {
          const values = columns.map(col => {
            const value = row[col];
            
            // Handle JSON columns
            if (col === 'metadata' || col === 'config' || col === 'summary' || 
                col === 'preferred_workflows' || col === 'quick_actions' || col === 'project_ids') {
              if (typeof value === 'string') {
                try {
                  return JSON.parse(value);
                } catch {
                  return value;
                }
              }
            }
            
            // Handle boolean columns
            if (typeof value === 'number' && (col.startsWith('is_') || col === 'is_active' || col === 'is_favorite')) {
              return value === 1;
            }
            
            return value;
          });

          await pgPool.query(insertSql, values);
        }

        // Reset sequence for auto-increment columns
        if (table !== 'user_sessions') {
          try {
            await pgPool.query(`
              SELECT setval(pg_get_serial_sequence('${table}', 'id'), 
                     COALESCE((SELECT MAX(id) FROM ${table}), 1))
            `);
          } catch (err) {
            // Table might not have an id column, skip
          }
        }

        console.log(`✅ Migrated ${rows.length} rows from ${table}`);
        totalRows += rows.length;

      } catch (error: any) {
        console.error(`❌ Error migrating ${table}:`, error.message);
        throw error;
      }
    }

    // Close connections
    await pgPool.end();
    sqliteDb.close();

    console.log('\n' + '='.repeat(60));
    console.log(`\n🎉 Migration completed successfully!`);
    console.log(`📊 Total rows migrated: ${totalRows}`);
    console.log(`\n✅ Your PostgreSQL database is ready!`);
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Update your .env with DATABASE_URL`);
    console.log(`   2. Restart your application`);
    console.log(`   3. Test that everything works`);
    console.log(`   4. Deploy to production\n`);

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run migration
migrateData();

