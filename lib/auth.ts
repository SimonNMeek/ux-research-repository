import { cookies } from 'next/headers';
import { getDb } from '@/db';
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
  const db = getDb();
  const row = db.prepare(`SELECT id, email, name, first_name, last_name, is_active, system_role, password_hash FROM users WHERE email = ? AND is_active = 1`).get(email) as (User & { password_hash: string }) | undefined;
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
      db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(newHash, row.id);
    }
  }
  
  if (!isValid) return null;
  
  db.prepare(`UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?`).run(row.id);
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

export function createSession(userId: number): { id: string; expiresAt: string } {
  const db = getDb();
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(`INSERT INTO user_sessions (id, user_id, expires_at) VALUES (?, ?, ?)`).run(id, userId, expiresAt);
  return { id, expiresAt };
}

export function validateSession(sessionId: string | undefined): User | null {
  if (!sessionId) return null;
  const db = getDb();
  const row = db.prepare(
    `SELECT u.id, u.email, u.name, u.first_name, u.last_name, u.is_active, u.system_role
     FROM user_sessions s JOIN users u ON s.user_id = u.id
     WHERE s.id = ? AND s.expires_at > CURRENT_TIMESTAMP`
  ).get(sessionId) as User | undefined;
  return row || null;
}

export function destroySession(sessionId: string | undefined): void {
  if (!sessionId) return;
  const db = getDb();
  db.prepare(`DELETE FROM user_sessions WHERE id = ?`).run(sessionId);
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


