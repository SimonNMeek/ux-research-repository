import { NextResponse } from 'next/server';
import { getDbAdapter, getDbType } from '@/db/adapter';

export async function GET() {
  try {
    const adapter = getDbAdapter();
    const dbType = getDbType();
    
    // Check if user_sessions table exists
    let sessionsExist = false;
    let sessions = [];
    
    try {
      if (dbType === 'postgres') {
        const result = await adapter.query('SELECT COUNT(*) as count FROM user_sessions');
        sessionsExist = true;
        sessions = result.rows;
      } else {
        const stmt = adapter.prepare('SELECT COUNT(*) as count FROM user_sessions');
        const result = stmt.get();
        sessionsExist = true;
        sessions = [result];
      }
    } catch (error) {
      sessionsExist = false;
    }
    
    // Check table structure
    let tableStructure = null;
    try {
      if (dbType === 'postgres') {
        const result = await adapter.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'user_sessions'
        `);
        tableStructure = result.rows;
      }
    } catch (error) {
      // Ignore error
    }
    
    return NextResponse.json({ 
      success: true,
      databaseType: dbType,
      sessionsExist,
      sessionCount: sessionsExist ? sessions[0]?.count || 0 : 0,
      tableStructure
    });
    
  } catch (error: any) {
    console.error('Error checking sessions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
