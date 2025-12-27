/**
 * Add invitations table to PostgreSQL database
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { getPostgresPool } from '../db/postgres';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const invitationsTableSQL = `
CREATE TABLE IF NOT EXISTS invitations (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  organization_id INTEGER NOT NULL,
  invited_by INTEGER NOT NULL,
  role VARCHAR(50) DEFAULT 'member',
  token VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_organization ON invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
`;

async function addInvitationsTable() {
  try {
    const pool = getPostgresPool();
    console.log('🔄 Creating invitations table...');
    
    await pool.query(invitationsTableSQL);
    
    console.log('✅ Invitations table created successfully!');
    
    // Check if table exists
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'invitations'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Table verification: invitations table exists');
    } else {
      console.log('❌ Table verification failed');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create invitations table:', error);
    process.exit(1);
  }
}

addInvitationsTable();
