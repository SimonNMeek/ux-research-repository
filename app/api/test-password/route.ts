import { NextResponse } from 'next/server';
import { getDbAdapter, getDbType } from '@/db/adapter';
import { compareSync } from 'bcryptjs';

export async function GET() {
  try {
    const adapter = getDbAdapter();
    const dbType = getDbType();
    
    let adminUser: any;
    if (dbType === 'postgres') {
      const result = await adapter.query('SELECT email, password_hash FROM users WHERE email = $1', ['admin@sol.com']);
      adminUser = result.rows[0];
    } else {
      const db = await import('@/db').then(m => m.getDb());
      adminUser = db.prepare('SELECT email, password_hash FROM users WHERE email = ?').get(['admin@sol.com']);
    }
    
    if (!adminUser) {
      return NextResponse.json({ error: 'Admin user not found' });
    }
    
    // Test password match
    const testPassword = 'admin123';
    const isBcrypt = adminUser.password_hash.startsWith('$2b$') || adminUser.password_hash.startsWith('$2a$');
    let matchesBcrypt = false;
    let matchesPlaintext = false;
    
    if (isBcrypt) {
      matchesBcrypt = compareSync(testPassword, adminUser.password_hash);
    } else {
      matchesPlaintext = testPassword === adminUser.password_hash;
    }
    
    return NextResponse.json({
      email: adminUser.email,
      passwordHashLength: adminUser.password_hash.length,
      passwordHashStart: adminUser.password_hash.substring(0, 10),
      isBcrypt,
      matchesBcrypt,
      matchesPlaintext,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}

