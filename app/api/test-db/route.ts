/**
 * Test Database Connection
 * Simple route to test if the database is working
 */

import { NextResponse } from 'next/server';
import { getDbAdapter, getDbType } from '@/db/adapter';

export async function GET() {
  try {
    console.log('Testing database connection...');
    
    const adapter = getDbAdapter();
    const dbType = getDbType();
    
    console.log('Database type:', dbType);
    console.log('DATABASE_URL set:', !!process.env.DATABASE_URL);
    
    // Test a simple query
    const result = await adapter.query('SELECT 1 as test');
    console.log('Query successful:', result);
    
    // Test if we can query users table
    const usersResult = await adapter.query('SELECT COUNT(*) as count FROM users');
    console.log('Users table accessible:', usersResult.rows[0]);
    
    // Test if admin user exists
    const adminResult = await adapter.query('SELECT email, system_role FROM users WHERE email = $1', ['admin@sol.com']);
    console.log('Admin user check:', adminResult.rows[0] || 'No admin user found');
    
    return NextResponse.json({
      success: true,
      databaseType: dbType,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      testQuery: result.rows[0],
      userCount: usersResult.rows[0],
      adminUser: adminResult.rows[0] || null
    });
    
  } catch (error) {
    console.error('Database test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
