import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();
const dbDir = path.join(projectRoot, 'db');
const dbPath = path.join(dbDir, 'data.sqlite');
const schemaPath = path.join(dbDir, 'schema.sql');

let database: Database.Database | null = null;

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



