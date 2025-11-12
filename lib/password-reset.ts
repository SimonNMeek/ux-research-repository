import crypto from 'crypto';
import { query } from '@/db/postgres';
import { hashPassword } from '@/lib/auth';
import {
  sendPasswordResetEmail,
  generatePasswordResetUrl,
} from '@/lib/email';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_EMAIL_PER_HOUR = 5;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateResetToken(): string {
  return (
    crypto.randomUUID().replace(/-/g, '') +
    crypto.randomBytes(16).toString('hex')
  );
}

export async function requestPasswordReset(email: string): Promise<void> {
  const normalizedEmail = normalizeEmail(email);

  // Allow the same response time regardless of user existence to avoid enumeration
  const start = Date.now();

  const userResult = await query<{ id: number; email: string }>(
    `SELECT id, email
       FROM users
      WHERE email = $1
        AND is_active = true`,
    [normalizedEmail]
  );
  const user = userResult.rows[0];

  if (user) {
    // Basic request throttling: limit to MAX_REQUESTS_PER_EMAIL_PER_HOUR
    await query(
      `DELETE FROM password_reset_tokens
        WHERE expires_at < CURRENT_TIMESTAMP`
    );

    const recentRequests = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
         FROM password_reset_tokens
        WHERE user_id = $1
          AND created_at > CURRENT_TIMESTAMP - INTERVAL '1 hour'`,
      [user.id]
    );

    if (parseInt(recentRequests.rows[0]?.count ?? '0', 10) < MAX_REQUESTS_PER_EMAIL_PER_HOUR) {
      const token = generateResetToken();
      const tokenHash = hashToken(token);
      const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

      await query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)`,
        [user.id, tokenHash, expiresAt.toISOString()]
      );

      const resetUrl = generatePasswordResetUrl(token);
      await sendPasswordResetEmail({
        to: user.email,
        resetUrl,
        expiresInMinutes: RESET_TOKEN_TTL_MS / (60 * 1000),
      });
    }
  }

  const elapsed = Date.now() - start;
  const minimumResponseTime = 400;
  if (elapsed < minimumResponseTime) {
    await new Promise((resolve) => setTimeout(resolve, minimumResponseTime - elapsed));
  }
}

export async function resetPasswordWithToken(token: string, password: string): Promise<void> {
  const tokenHash = hashToken(token);

  const tokenResult = await query<{
    id: number;
    user_id: number;
    expires_at: Date;
    used_at: Date | null;
  }>(
    `SELECT id, user_id, expires_at, used_at
       FROM password_reset_tokens
      WHERE token_hash = $1`,
    [tokenHash]
  );

  const record = tokenResult.rows[0];

  if (!record) {
    throw new Error('Invalid or expired password reset link');
  }

  if (record.used_at) {
    throw new Error('This password reset link has already been used');
  }

  if (new Date(record.expires_at).getTime() < Date.now()) {
    throw new Error('Password reset link has expired');
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  const passwordHash = hashPassword(password);

  await query(
    `UPDATE users
        SET password_hash = $1,
            updated_at = CURRENT_TIMESTAMP
      WHERE id = $2`,
    [passwordHash, record.user_id]
  );

  await query(
    `UPDATE password_reset_tokens
        SET used_at = CURRENT_TIMESTAMP
      WHERE id = $1`,
    [record.id]
  );

  // Invalidate existing sessions to force re-login
  await query(
    `DELETE FROM user_sessions
      WHERE user_id = $1`,
    [record.user_id]
  );
}

