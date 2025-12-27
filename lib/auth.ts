import { cookies } from 'next/headers';
import { compareSync, hashSync } from 'bcryptjs';
import { query } from '@/db/postgres';

export type User = {
  id: number;
  email: string;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  is_active: number;
  system_role?: string;
};

function mapUserRow(row: any): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    first_name: row.first_name ?? null,
    last_name: row.last_name ?? null,
    is_active: row.is_active ? 1 : 0,
    system_role: row.system_role ?? undefined,
  };
}

export function hashPassword(password: string): string {
  return hashSync(password, 10);
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const result = await query<User & { password_hash: string }>(
    `SELECT id, email, name, first_name, last_name, is_active, system_role, password_hash
     FROM users
     WHERE email = $1 AND is_active = true`,
    [email]
  );

  const row = result.rows[0];
  if (!row) return null;

  let isValid = false;
  if (row.password_hash.startsWith('$2b$') || row.password_hash.startsWith('$2a$')) {
    isValid = compareSync(password, row.password_hash);
  } else {
    isValid = password === row.password_hash;
    if (isValid) {
      const newHash = hashPassword(password);
      await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [newHash, row.id]);
    }
  }

  if (!isValid) return null;

  await query(`UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1`, [row.id]);

  return mapUserRow(row);
}

export async function createSession(userId: number): Promise<{ id: string; expiresAt: string }> {
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await query(`INSERT INTO user_sessions (id, user_id, expires_at) VALUES ($1, $2, $3)`, [
    id,
    userId,
    expiresAt,
  ]);

  return { id, expiresAt };
}

export async function validateSession(sessionId: string | undefined): Promise<User | null> {
  if (!sessionId) return null;

  const result = await query<User>(
    `SELECT u.id, u.email, u.name, u.first_name, u.last_name, u.is_active, u.system_role
       FROM user_sessions s
       JOIN users u ON s.user_id = u.id
      WHERE s.id = $1 AND s.expires_at > CURRENT_TIMESTAMP`,
    [sessionId]
  );

  const row = result.rows[0];
  return row ? mapUserRow(row) : null;
}

export async function destroySession(sessionId: string | undefined): Promise<void> {
  if (!sessionId) return;
  await query(`DELETE FROM user_sessions WHERE id = $1`, [sessionId]);
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


