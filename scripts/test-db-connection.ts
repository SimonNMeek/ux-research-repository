/**
 * Test Database Connection
 * Simple script to test if the database adapter works with the Neon connection
 */

import { getDbAdapter, getDbType } from '../db/adapter';

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...');
    console.log('Database type:', getDbType());
    console.log('DATABASE_URL set:', !!process.env.DATABASE_URL);
    
    const adapter = getDbAdapter();
    console.log('Adapter created:', adapter.type);
    
    // Test a simple query
    const result = await adapter.query('SELECT 1 as test');
    console.log('✅ Query successful:', result);
    
    // Test if we can query users table
    const usersResult = await adapter.query('SELECT COUNT(*) as count FROM users');
    console.log('✅ Users table accessible:', usersResult.rows[0]);
    
    // Test if admin user exists
    const adminResult = await adapter.query('SELECT email, system_role FROM users WHERE email = $1', ['admin@sol.com']);
    console.log('✅ Admin user check:', adminResult.rows[0] || 'No admin user found');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testConnection().catch(console.error);
}
