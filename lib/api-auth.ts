/**
 * API Key Authentication for LLM Integration
 * Provides Bearer token authentication for REST API endpoints
 */

import { hashSync, compareSync } from 'bcryptjs';
import { query } from '@/db/postgres';

export interface ApiKeyUser {
  id: number;
  email: string;
  name: string;
  system_role?: string;
  api_key_id: number;
  organization_id?: number;
  scope_type: 'user' | 'organization';
}

export function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'sk-';
  for (let i = 0; i < 48; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

export function hashApiKey(key: string): string {
  return hashSync(key, 10);
}

export async function createApiKey(
  userId: number,
  name: string,
  expiresAt?: Date
): Promise<{ key: string; prefix: string; id: number }> {
  const key = generateApiKey();
  const keyHash = hashApiKey(key);
  const keyPrefix = key.substring(0, 12);

  const result = await query<{ id: number }>(
    `INSERT INTO api_keys (user_id, key_hash, key_prefix, name, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [userId, keyHash, keyPrefix, name, expiresAt || null]
  );

  return { key, prefix: keyPrefix, id: result.rows[0].id };
}

export async function createOrganizationApiKey(
  organizationId: number,
  name: string,
  expiresAt?: Date
): Promise<{ key: string; prefix: string; id: number }> {
  const key = generateApiKey();
  const keyHash = hashApiKey(key);
  const keyPrefix = key.substring(0, 12);

  const result = await query<{ id: number }>(
    `INSERT INTO api_keys (organization_id, key_hash, key_prefix, name, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [organizationId, keyHash, keyPrefix, name, expiresAt || null]
  );

  return { key, prefix: keyPrefix, id: result.rows[0].id };
}

export async function validateApiKey(key: string): Promise<ApiKeyUser | null> {
  if (!key || !key.startsWith('sk-')) {
    return null;
  }

  try {
    // Fetch all active API keys (we need to compare hashes in memory since bcrypt
    // doesn't support SQL comparison). However, we filter by active status and expiration
    // to reduce the number of keys we need to check.
    const result = await query<{
      api_key_id: number;
      key_hash: string;
      user_id: number | null;
      organization_id: number | null;
      id: number | null;
      email: string | null;
      name: string | null;
      system_role: string | null;
    }>(
      `SELECT ak.id as api_key_id, ak.key_hash, ak.user_id, ak.organization_id,
              u.id, u.email, u.name, u.system_role
       FROM api_keys ak
       LEFT JOIN users u ON ak.user_id = u.id
       WHERE ak.is_active = true
         AND (ak.expires_at IS NULL OR ak.expires_at > CURRENT_TIMESTAMP)
         AND (u.is_active = true OR u.is_active IS NULL)`
    );

    for (const apiKey of result.rows) {
      // Compare the provided key against each stored hash
      if (!compareSync(key, apiKey.key_hash)) {
        continue;
      }

      // Update last_used_at asynchronously (don't wait for it)
      query(`UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1`, [
        apiKey.api_key_id,
      ]).catch(err => console.error('Error updating api_key last_used_at:', err));

      // Handle user-scoped API key
      if (apiKey.user_id && apiKey.id && apiKey.email && apiKey.name) {
        return {
          id: apiKey.id,
          email: apiKey.email,
          name: apiKey.name,
          system_role: apiKey.system_role || undefined,
          api_key_id: apiKey.api_key_id,
          scope_type: 'user',
        };
      }

      // Handle organization-scoped API key
      if (apiKey.organization_id) {
        return {
          id: 0,
          email: `org-${apiKey.organization_id}@system`,
          name: 'Organization API Key',
          system_role: 'contributor',
          api_key_id: apiKey.api_key_id,
          organization_id: apiKey.organization_id,
          scope_type: 'organization',
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error validating API key:', error);
    return null;
  }
}

export async function listApiKeys(userId: number): Promise<
  Array<{
    id: number;
    name: string;
    key_prefix: string;
    last_used_at: string | null;
    created_at: string;
    expires_at: string | null;
    is_active: boolean;
  }>
> {
  const result = await query(
    `SELECT id, name, key_prefix, last_used_at, created_at, expires_at, is_active
     FROM api_keys
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function listOrganizationApiKeys(organizationId: number): Promise<
  Array<{
    id: number;
    name: string;
    key_prefix: string;
    last_used_at: string | null;
    created_at: string;
    expires_at: string | null;
    is_active: boolean;
  }>
> {
  const result = await query(
    `SELECT id, name, key_prefix, last_used_at, created_at, expires_at, is_active
     FROM api_keys
     WHERE organization_id = $1
     ORDER BY created_at DESC`,
    [organizationId]
  );
  return result.rows;
}

export async function revokeApiKey(keyId: number, userId: number): Promise<boolean> {
  const result = await query(
    `UPDATE api_keys SET is_active = false WHERE id = $1 AND user_id = $2`,
    [keyId, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function revokeOrganizationApiKey(keyId: number, organizationId: number): Promise<boolean> {
  const result = await query(
    `UPDATE api_keys SET is_active = false WHERE id = $1 AND organization_id = $2`,
    [keyId, organizationId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function deleteApiKey(keyId: number, userId: number): Promise<boolean> {
  const result = await query(
    `DELETE FROM api_keys WHERE id = $1 AND user_id = $2`,
    [keyId, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function deleteOrganizationApiKey(keyId: number, organizationId: number): Promise<boolean> {
  const result = await query(
    `DELETE FROM api_keys WHERE id = $1 AND organization_id = $2`,
    [keyId, organizationId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function trackApiUsage(
  apiKeyId: number,
  endpoint: string,
  workspaceId?: number,
  organizationId?: number
): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Check if usage record exists
    const existing = await query(
      `SELECT id, request_count FROM api_key_usage 
       WHERE api_key_id = $1 AND endpoint = $2 AND date = $3 
       AND (workspace_id = $4 OR (workspace_id IS NULL AND $4 IS NULL))
       AND (organization_id = $5 OR (organization_id IS NULL AND $5 IS NULL))
       LIMIT 1`,
      [apiKeyId, endpoint, today, workspaceId || null, organizationId || null]
    );

    if (existing.rows.length > 0) {
      // Update existing record
      await query(
        `UPDATE api_key_usage SET request_count = request_count + 1 WHERE id = $1`,
        [existing.rows[0].id]
      );
    } else {
      // Insert new record
      await query(
        `INSERT INTO api_key_usage (api_key_id, endpoint, workspace_id, organization_id, date, request_count)
         VALUES ($1, $2, $3, $4, $5, 1)`,
        [apiKeyId, endpoint, workspaceId || null, organizationId || null, today]
      );
    }
  } catch (error) {
    // Don't fail the request if tracking fails
    console.error('Error tracking API usage:', error);
  }
}

export async function deleteAllUserKeys(userId: number): Promise<void> {
  await query(`DELETE FROM api_keys WHERE user_id = $1`, [userId]);
}

export async function deleteAllOrganizationKeys(organizationId: number): Promise<void> {
  await query(`DELETE FROM api_keys WHERE organization_id = $1`, [organizationId]);
}

