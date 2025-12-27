/**
 * Test script to check if invitations table exists and create it if needed
 */

import { getPostgresPool } from '../db/postgres';

async function checkAndCreateInvitationsTable() {
  const pool = getPostgresPool();
  
  try {
    // Check if invitations table exists
    const checkResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'invitations'
      );
    `);
    
    const tableExists = checkResult.rows[0].exists;
    
    if (!tableExists) {
      console.log('Creating invitations table...');
      
      await pool.query(`
        CREATE TABLE invitations (
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
      `);
      
      // Create indexes
      await pool.query('CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_invitations_organization ON invitations(organization_id);');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);');
      
      console.log('✅ Invitations table created successfully');
    } else {
      console.log('✅ Invitations table already exists');
    }
    
    // Test the table by checking if we can query it
    const testResult = await pool.query('SELECT COUNT(*) FROM invitations');
    console.log(`📊 Invitations table has ${testResult.rows[0].count} records`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkAndCreateInvitationsTable().catch(console.error);
