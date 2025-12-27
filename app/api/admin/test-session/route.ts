import { NextRequest, NextResponse } from 'next/server';
import { getDbAdapter, getDbType } from '@/db/adapter';

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();
    
    const adapter = getDbAdapter();
    const dbType = getDbType();
    
    let session;
    if (dbType === 'postgres') {
      const result = await adapter.query(
        `SELECT s.id, s.user_id, s.expires_at, u.email, u.system_role
         FROM user_sessions s 
         JOIN users u ON s.user_id = u.id
         WHERE s.id = $1 AND s.expires_at > CURRENT_TIMESTAMP`,
        [sessionId]
      );
      session = result.rows[0];
    } else {
      const stmt = adapter.prepare(
        `SELECT s.id, s.user_id, s.expires_at, u.email, u.system_role
         FROM user_sessions s 
         JOIN users u ON s.user_id = u.id
         WHERE s.id = ? AND s.expires_at > datetime('now')`
      );
      session = stmt.get([sessionId]);
    }
    
    if (!session) {
      return NextResponse.json({ 
        error: 'Session not found or expired',
        sessionId,
        databaseType: dbType
      }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true,
      session: {
        id: session.id,
        userId: session.user_id,
        email: session.email,
        systemRole: session.system_role,
        expiresAt: session.expires_at
      }
    });
    
  } catch (error: any) {
    console.error('Error testing session:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
