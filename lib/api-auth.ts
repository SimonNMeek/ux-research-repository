/**
 * API Key Authentication for LLM Integration
 * Provides Bearer token authentication for REST API endpoints
 */

import { hashSync, compareSync } from 'bcryptjs';
import { getDbAdapter, getDbType } from '@/db/adapter';
import { getDb } from '@/db';

export interface ApiKeyUser {
  id: number;
  email: string;
  name: string;
  system_role?: string;
  api_key_id: number;
  organization_id?: number; // For organization-scoped API keys
  scope_type: 'user' | 'organization';
}

/**
 * Generate a new API key
 * Format: sk-{random32chars} (similar to OpenAI format)
 */
export function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'sk-';
  for (let i = 0; i < 48; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

/**
 * Hash an API key for storage
 */
export function hashApiKey(key: string): string {
  return hashSync(key, 10);
}

/**
 * Create a new API key for a user
 */
export async function createApiKey(
  userId: number,
  name: string,
  expiresAt?: Date
): Promise<{ key: string; prefix: string; id: number }> {
  const adapter = getDbAdapter();
  const dbType = getDbType();
  
  const key = generateApiKey();
  const keyHash = hashApiKey(key);
  const keyPrefix = key.substring(0, 12); // sk-XXXXXXXX for display

  let keyId: number;
  if (dbType === 'postgres') {
    const result = await adapter.query(
      `INSERT INTO api_keys (user_id, key_hash, key_prefix, name, expires_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [userId, keyHash, keyPrefix, name, expiresAt || null]
    );
    keyId = result.rows[0].id;
  } else {
    const db = getDb();
    const result = db
      .prepare(
        `INSERT INTO api_keys (user_id, key_hash, key_prefix, name, expires_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(userId, keyHash, keyPrefix, name, expiresAt?.toISOString() || null);
    keyId = result.lastInsertRowid as number;
  }

  return { key, prefix: keyPrefix, id: keyId };
}

/**
 * Create a new organization-scoped API key
 */
export async function createOrganizationApiKey(
  organizationId: number,
  name: string,
  expiresAt?: Date
): Promise<{ key: string; prefix: string; id: number }> {
  const adapter = getDbAdapter();
  const dbType = getDbType();
  
  const key = generateApiKey();
  const keyHash = hashApiKey(key);
  const keyPrefix = key.substring(0, 12); // sk-XXXXXXXX for display

  let keyId: number;
  if (dbType === 'postgres') {
    const result = await adapter.query(
      `INSERT INTO api_keys (organization_id, key_hash, key_prefix, name, expires_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [organizationId, keyHash, keyPrefix, name, expiresAt || null]
    );
    keyId = result.rows[0].id;
  } else {
    const db = getDb();
    const result = db
      .prepare(
        `INSERT INTO api_keys (organization_id, key_hash, key_prefix, name, expires_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(organizationId, keyHash, keyPrefix, name, expiresAt?.toISOString() || null);
    keyId = result.lastInsertRowid as number;
  }

  return { key, prefix: keyPrefix, id: keyId };
}

/**
 * Validate an API key and return the associated user or organization context
 */
export async function validateApiKey(key: string): Promise<ApiKeyUser | null> {
  if (!key || !key.startsWith('sk-')) {
    return null;
  }

  const adapter = getDbAdapter();
  const dbType = getDbType();

  // Get all active API keys (we need to check each hash)
  // In production, you'd want to optimize this with a better lookup strategy
  let apiKeys: any[];
  if (dbType === 'postgres') {
    const result = await adapter.query(
      `SELECT ak.id as api_key_id, ak.key_hash, ak.expires_at, ak.user_id, ak.organization_id,
              u.id, u.email, u.name, u.system_role
       FROM api_keys ak
       LEFT JOIN users u ON ak.user_id = u.id
       WHERE ak.is_active = true 
       AND (ak.expires_at IS NULL OR ak.expires_at > CURRENT_TIMESTAMP)
       AND (u.is_active = true OR u.is_active IS NULL)`
    );
    apiKeys = result.rows;
  } else {
    const db = getDb();
    apiKeys = db
      .prepare(
        `SELECT ak.id as api_key_id, ak.key_hash, ak.expires_at, ak.user_id, ak.organization_id,
                u.id, u.email, u.name, u.system_role
         FROM api_keys ak
         LEFT JOIN users u ON ak.user_id = u.id
         WHERE ak.is_active = 1 
         AND (ak.expires_at IS NULL OR ak.expires_at > CURRENT_TIMESTAMP)
         AND (u.is_active = 1 OR u.is_active IS NULL)`
      )
      .all();
  }

  // Check each key hash
  for (const apiKey of apiKeys) {
    if (compareSync(key, apiKey.key_hash)) {
      // Update last_used_at
      if (dbType === 'postgres') {
        await adapter.query(
          `UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [apiKey.api_key_id]
        );
      } else {
        const db = getDb();
        db.prepare(`UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?`).run(
          apiKey.api_key_id
        );
      }

      // Determine if this is a user-scoped or organization-scoped key
      if (apiKey.user_id) {
        // User-scoped API key
        return {
          id: apiKey.id,
          email: apiKey.email,
          name: apiKey.name,
          system_role: apiKey.system_role,
          api_key_id: apiKey.api_key_id,
          scope_type: 'user' as const,
        };
      } else if (apiKey.organization_id) {
        // Organization-scoped API key - return a synthetic user context
        return {
          id: 0, // No specific user ID for org keys
          email: `org-${apiKey.organization_id}@system`, // Synthetic email
          name: `Organization API Key`,
          system_role: 'contributor', // Default role for org keys
          api_key_id: apiKey.api_key_id,
          organization_id: apiKey.organization_id,
          scope_type: 'organization' as const,
        };
      }
    }
  }

  return null;
}

/**
 * List all API keys for a user (without showing the actual keys)
 */
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
  const adapter = getDbAdapter();
  const dbType = getDbType();

  let keys: any[];
  if (dbType === 'postgres') {
    const result = await adapter.query(
      `SELECT id, name, key_prefix, last_used_at, created_at, expires_at, is_active
       FROM api_keys
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    keys = result.rows;
  } else {
    const db = getDb();
    keys = db
      .prepare(
        `SELECT id, name, key_prefix, last_used_at, created_at, expires_at, is_active
         FROM api_keys
         WHERE user_id = ?
         ORDER BY created_at DESC`
      )
      .all(userId);
  }

  return keys;
}

/**
 * List all API keys for an organization (without showing the actual keys)
 */
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
  const adapter = getDbAdapter();
  const dbType = getDbType();

  let keys: any[];
  if (dbType === 'postgres') {
    const result = await adapter.query(
      `SELECT id, name, key_prefix, last_used_at, created_at, expires_at, is_active
       FROM api_keys
       WHERE organization_id = $1
       ORDER BY created_at DESC`,
      [organizationId]
    );
    keys = result.rows;
  } else {
    const db = getDb();
    keys = db
      .prepare(
        `SELECT id, name, key_prefix, last_used_at, created_at, expires_at, is_active
         FROM api_keys
         WHERE organization_id = ?
         ORDER BY created_at DESC`
      )
      .all(organizationId);
  }

  return keys;
}

/**
 * Revoke (deactivate) an API key
 */
export async function revokeApiKey(keyId: number, userId: number): Promise<boolean> {
  const adapter = getDbAdapter();
  const dbType = getDbType();

  if (dbType === 'postgres') {
    const result = await adapter.query(
      `UPDATE api_keys SET is_active = false WHERE id = $1 AND user_id = $2`,
      [keyId, userId]
    );
    return result.rowCount ? result.rowCount > 0 : false;
  } else {
    const db = getDb();
    const result = db
      .prepare(`UPDATE api_keys SET is_active = 0 WHERE id = ? AND user_id = ?`)
      .run(keyId, userId);
    return result.changes > 0;
  }
}

/**
 * Revoke (deactivate) an organization API key
 */
export async function revokeOrganizationApiKey(keyId: number, organizationId: number): Promise<boolean> {
  const adapter = getDbAdapter();
  const dbType = getDbType();

  if (dbType === 'postgres') {
    const result = await adapter.query(
      `UPDATE api_keys SET is_active = false WHERE id = $1 AND organization_id = $2`,
      [keyId, organizationId]
    );
    return result.rowCount ? result.rowCount > 0 : false;
  } else {
    const db = getDb();
    const result = db
      .prepare(`UPDATE api_keys SET is_active = 0 WHERE id = ? AND organization_id = ?`)
      .run(keyId, organizationId);
    return result.changes > 0;
  }
}

/**
 * Delete an API key permanently
 */
export async function deleteApiKey(keyId: number, userId: number): Promise<boolean> {
  const adapter = getDbAdapter();
  const dbType = getDbType();

  if (dbType === 'postgres') {
    const result = await adapter.query(
      `DELETE FROM api_keys WHERE id = $1 AND user_id = $2`,
      [keyId, userId]
    );
    return result.rowCount ? result.rowCount > 0 : false;
  } else {
    const db = getDb();
    const result = db.prepare(`DELETE FROM api_keys WHERE id = ? AND user_id = ?`).run(keyId, userId);
    return result.changes > 0;
  }
}

/**
 * Delete an organization API key permanently
 */
export async function deleteOrganizationApiKey(keyId: number, organizationId: number): Promise<boolean> {
  const adapter = getDbAdapter();
  const dbType = getDbType();

  if (dbType === 'postgres') {
    const result = await adapter.query(
      `DELETE FROM api_keys WHERE id = $1 AND organization_id = $2`,
      [keyId, organizationId]
    );
    return result.rowCount ? result.rowCount > 0 : false;
  } else {
    const db = getDb();
    const result = db.prepare(`DELETE FROM api_keys WHERE id = ? AND organization_id = ?`).run(keyId, organizationId);
    return result.changes > 0;
  }
}

/**
 * Track API usage for rate limiting and analytics
 */
export async function trackApiUsage(
  apiKeyId: number,
  endpoint: string,
  workspaceId?: number,
  organizationId?: number
): Promise<void> {
  const adapter = getDbAdapter();
  const dbType = getDbType();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  if (dbType === 'postgres') {
    // Use INSERT ... ON CONFLICT to increment count
    await adapter.query(
      `INSERT INTO api_key_usage (api_key_id, endpoint, workspace_id, organization_id, date, request_count)
       VALUES ($1, $2, $3, $4, $5, 1)
       ON CONFLICT (api_key_id, endpoint, date, workspace_id, organization_id) 
       DO UPDATE SET request_count = api_key_usage.request_count + 1`,
      [apiKeyId, endpoint, workspaceId || null, organizationId || null, today]
    );
  } else {
    const db = getDb();
    // Check if entry exists
    const existing = db
      .prepare(
        `SELECT id, request_count FROM api_key_usage 
         WHERE api_key_id = ? AND endpoint = ? AND date = ? AND workspace_id IS ? AND organization_id IS ?`
      )
      .get(apiKeyId, endpoint, today, workspaceId || null, organizationId || null) as
      | { id: number; request_count: number }
      | undefined;

    if (existing) {
      db.prepare(`UPDATE api_key_usage SET request_count = ? WHERE id = ?`).run(
        existing.request_count + 1,
        existing.id
      );
    } else {
      db.prepare(
        `INSERT INTO api_key_usage (api_key_id, endpoint, workspace_id, organization_id, date, request_count)
         VALUES (?, ?, ?, ?, ?, 1)`
      ).run(apiKeyId, endpoint, workspaceId || null, organizationId || null, today);
    }
  }
}

