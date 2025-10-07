import { cookies } from 'next/headers';
import { getDb } from '@/db';

export type User = {
  id: number;
  email: string;
  name: string;
  is_active: number;
};

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const db = getDb();
  const row = db.prepare(`SELECT id, email, name, is_active, password_hash FROM users WHERE email = ? AND is_active = 1`).get(email) as (User & { password_hash: string }) | undefined;
  if (!row) return null;
  // Minimal check: password equals stored password_hash (seeded as plain for demo)
  if (password !== row.password_hash) return null;
  db.prepare(`UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?`).run(row.id);
  return { id: row.id, email: row.email, name: row.name, is_active: row.is_active };
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
    `SELECT u.id, u.email, u.name, u.is_active
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


