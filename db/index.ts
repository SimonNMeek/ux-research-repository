import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();
const dbDir = path.join(projectRoot, 'db');
const dbPath = path.join(dbDir, 'data.sqlite');
const schemaPath = path.join(dbDir, 'schema.sql');
const migrationsDir = path.join(dbDir, 'migrations');

let database: Database.Database | null = null;

function runMigrations(db: Database.Database) {
  // Create migrations table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT UNIQUE NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Get list of already applied migrations
  const applied = new Set(
    (db.prepare('SELECT filename FROM migrations').all() as Array<{ filename: string }>)
      .map(row => row.filename)
  );

  // Check if migrations directory exists
  if (!fs.existsSync(migrationsDir)) {
    return; // No migrations to run
  }

  // Get all migration files
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort(); // Ensure migrations run in order

  // Run pending migrations
  for (const filename of migrationFiles) {
    if (!applied.has(filename)) {
      console.log(`Running migration: ${filename}`);
      const migrationPath = path.join(migrationsDir, filename);
      const migrationSql = fs.readFileSync(migrationPath, 'utf8');
      
      try {
        db.exec(migrationSql);
        db.prepare('INSERT INTO migrations (filename) VALUES (?)').run(filename);
        console.log(`✓ Migration ${filename} applied successfully`);
      } catch (error) {
        console.error(`✗ Migration ${filename} failed:`, error);
        throw error;
      }
    }
  }
}

export function getDb(): Database.Database {
  if (database) return database;

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Open database with write-ahead logging for better concurrency
  database = new Database(dbPath);
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');

  // Initialize schema if needed
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  database.exec(schemaSql);

  // Run migrations
  runMigrations(database);

  return database;
}

export function closeDb(): void {
  if (database) {
    database.close();
    database = null;
  }
}

export type NoteRow = {
  id: number;
  filename: string;
  content: string;
  created_at: string;
};



