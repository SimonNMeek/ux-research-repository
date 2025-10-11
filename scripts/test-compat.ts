/**
 * Test Compatibility Layer
 */

import { getDb } from '../db/index';

async function testCompat() {
  try {
    console.log('🔍 Testing compatibility layer...');
    
    const db = getDb();
    console.log('✅ getDb() returned:', typeof db);
    
    // Test a simple query
    const result = await db.prepare('SELECT 1 as test').get();
    console.log('✅ Simple query:', result);
    
    // Test users table
    const usersResult = await db.prepare('SELECT COUNT(*) as count FROM users').get();
    console.log('✅ Users count:', usersResult);
    
    // Test admin user
    const adminResult = await db.prepare('SELECT email, system_role FROM users WHERE email = ?').get(['admin@sol.com']);
    console.log('✅ Admin user:', adminResult);
    
  } catch (error) {
    console.error('❌ Compatibility test failed:', error);
    throw error;
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testCompat().catch(console.error);
}
