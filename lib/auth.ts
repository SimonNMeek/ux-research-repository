import { cookies } from 'next/headers';
import { getDbAdapter, getDbType } from '@/db/adapter';
import { compareSync, hashSync } from 'bcryptjs';

export type User = {
  id: number;
  email: string;
  name: string;
  first_name?: string;
  last_name?: string;
  is_active: number;
  system_role?: string;
};

export function hashPassword(password: string): string {
  return hashSync(password, 10);
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const adapter = getDbAdapter();
  const dbType = getDbType();
  
  let row: (User & { password_hash: string }) | undefined;
  
  if (dbType === 'postgres') {
    const result = await adapter.query(`SELECT id, email, name, first_name, last_name, is_active, system_role, password_hash FROM users WHERE email = $1 AND is_active = true`, [email]);
    row = result.rows[0] as (User & { password_hash: string }) | undefined;
  } else {
    const stmt = adapter.prepare(`SELECT id, email, name, first_name, last_name, is_active, system_role, password_hash FROM users WHERE email = ? AND is_active = 1`);
    row = stmt.get([email]) as (User & { password_hash: string }) | undefined;
  }
  
  if (!row) return null;
  
  // Check if password_hash is plain text (legacy/demo users)
  let isValid = false;
  if (row.password_hash.startsWith('$2b$') || row.password_hash.startsWith('$2a$')) {
    // Bcrypt hash
    isValid = compareSync(password, row.password_hash);
  } else {
    // Plain text (demo mode) - check and upgrade
    isValid = password === row.password_hash;
    if (isValid) {
      // Upgrade to bcrypt
      const newHash = hashPassword(password);
      if (dbType === 'postgres') {
        await adapter.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [newHash, row.id]);
      } else {
        const updateStmt = adapter.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`);
        updateStmt.run([newHash, row.id]);
      }
    }
  }
  
  if (!isValid) return null;
  
  // Update last login
  if (dbType === 'postgres') {
    await adapter.query(`UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1`, [row.id]);
  } else {
    const updateStmt = adapter.prepare(`UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?`);
    updateStmt.run([row.id]);
  }
  
  return { 
    id: row.id, 
    email: row.email, 
    name: row.name, 
    first_name: row.first_name,
    last_name: row.last_name,
    is_active: row.is_active,
    system_role: row.system_role 
  };
}

export async function createSession(userId: number): Promise<{ id: string; expiresAt: string }> {
  const adapter = getDbAdapter();
  const dbType = getDbType();
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  
  if (dbType === 'postgres') {
    await adapter.query(`INSERT INTO user_sessions (id, user_id, expires_at) VALUES ($1, $2, $3)`, [id, userId, expiresAt]);
  } else {
    const stmt = adapter.prepare(`INSERT INTO user_sessions (id, user_id, expires_at) VALUES (?, ?, ?)`);
    stmt.run([id, userId, expiresAt]);
  }
  
  return { id, expiresAt };
}

export async function validateSession(sessionId: string | undefined): Promise<User | null> {
  if (!sessionId) return null;
  const adapter = getDbAdapter();
  const dbType = getDbType();
  
  let row: User | undefined;
  
  if (dbType === 'postgres') {
    const result = await adapter.query(
      `SELECT u.id, u.email, u.name, u.first_name, u.last_name, u.is_active, u.system_role
       FROM user_sessions s JOIN users u ON s.user_id = u.id
       WHERE s.id = $1 AND s.expires_at > CURRENT_TIMESTAMP`,
      [sessionId]
    );
    row = result.rows[0] as User | undefined;
  } else {
    const stmt = adapter.prepare(
      `SELECT u.id, u.email, u.name, u.first_name, u.last_name, u.is_active, u.system_role
       FROM user_sessions s JOIN users u ON s.user_id = u.id
       WHERE s.id = ? AND s.expires_at > CURRENT_TIMESTAMP`
    );
    row = stmt.get([sessionId]) as User | undefined;
  }
  
  return row || null;
}

export async function destroySession(sessionId: string | undefined): Promise<void> {
  if (!sessionId) return;
  const adapter = getDbAdapter();
  const dbType = getDbType();
  
  if (dbType === 'postgres') {
    await adapter.query(`DELETE FROM user_sessions WHERE id = $1`, [sessionId]);
  } else {
    const stmt = adapter.prepare(`DELETE FROM user_sessions WHERE id = ?`);
    stmt.run([sessionId]);
  }
}

export async function setSessionCookie(sessionId: string, expiresAtIso: string) {
  const store = await cookies();
  store.set('session_id', sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    expires: new Date(expiresAtIso),
  });
}

export async function getSessionCookie(): Promise<string | undefined> {
  const store = await cookies();
  return store.get('session_id')?.value;
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set('session_id', '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
}


