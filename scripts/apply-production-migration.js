#!/usr/bin/env node

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 1,
    min: 0,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  try {
    console.log('Connecting to production database...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../db/migrations/011_create_invitations_postgres.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Applying migration: 011_create_invitations_postgres.sql');
    await pool.query(migrationSQL);
    
    console.log('✅ Migration applied successfully!');
    
    // Verify the table was created
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'invitations'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Invitations table exists in production database');
    } else {
      console.log('❌ Invitations table not found');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyMigration();
