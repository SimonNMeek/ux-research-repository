import { NextResponse } from 'next/server';
import { getDbAdapter, getDbType } from '@/db/adapter';

export async function GET() {
  try {
    const adapter = getDbAdapter();
    const dbType = getDbType();
    
    let users;
    if (dbType === 'postgres') {
      const result = await adapter.query('SELECT id, email, first_name, last_name, system_role FROM users');
      users = result.rows;
    } else {
      const stmt = adapter.prepare('SELECT id, email, first_name, last_name, system_role FROM users');
      users = stmt.all();
    }
    
    return NextResponse.json({ 
      success: true, 
      users,
      count: users.length
    });
    
  } catch (error: any) {
    console.error('Error checking users:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
