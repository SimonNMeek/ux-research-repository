/**
 * PostgreSQL Database Adapter
 * Provides connection pooling and query interface for Postgres
 */

import { Pool, PoolClient, QueryResult } from 'pg';

let pool: Pool | null = null;

/**
 * Get or create PostgreSQL connection pool
 */
export function getPostgresPool(): Pool {
  if (pool) return pool;

  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required for PostgreSQL');
  }

  pool = new Pool({
    connectionString: databaseUrl,
    max: 10, // Reduced pool size to avoid connection exhaustion
    min: 2, // Keep minimum connections alive
    idleTimeoutMillis: 60000, // Close idle clients after 60 seconds
    connectionTimeoutMillis: 10000, // Reduced timeout to 10 seconds
    acquireTimeoutMillis: 10000, // Timeout for acquiring connection from pool
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    // Add keep-alive settings for better connection stability
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    // Add statement timeout to prevent long-running queries
    statement_timeout: 30000, // 30 seconds
  });

  // Handle pool errors
  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
  });

  return pool;
}

/**
 * Execute a query with automatic connection management and retry logic
 */
export async function query<T = any>(
  text: string,
  params?: any[],
  retries: number = 2
): Promise<QueryResult<T>> {
  const pool = getPostgresPool();
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await pool.query(text, params);
    } catch (error) {
      console.error(`PostgreSQL query error (attempt ${attempt + 1}/${retries + 1}):`, {
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        params: params?.slice(0, 3), // Log first 3 params for debugging
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // If this is the last attempt or it's not a connection error, throw
      if (attempt === retries || !(error instanceof Error && error.message.includes('ETIMEDOUT'))) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  
  throw new Error('All retry attempts failed');
}

/**
 * Get a client from the pool for transaction support
 */
export async function getClient(): Promise<PoolClient> {
  const pool = getPostgresPool();
  return await pool.connect();
}

/**
 * Execute queries in a transaction
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Set the current user ID for Row-Level Security
 * This must be called at the start of each request
 */
export async function setCurrentUser(client: PoolClient, userId: number): Promise<void> {
  await client.query('SET LOCAL app.user_id = $1', [userId]);
}

/**
 * Set the current organization ID for additional context
 */
export async function setCurrentOrganization(
  client: PoolClient,
  organizationId: number
): Promise<void> {
  await client.query('SET LOCAL app.organization_id = $1', [organizationId]);
}

/**
 * Close the connection pool (for graceful shutdown)
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Check if PostgreSQL is connected and ready
 */
export async function isHealthy(): Promise<boolean> {
  try {
    const result = await query('SELECT 1 as health');
    return result.rows[0]?.health === 1;
  } catch (error) {
    return false;
  }
}

/**
 * PostgreSQL-specific query builder helpers
 */
export const postgres = {
  /**
   * Convert SQLite AUTOINCREMENT to Postgres SERIAL
   */
  returning: (columns: string = '*') => `RETURNING ${columns}`,

  /**
   * Convert SQLite datetime to Postgres timestamp
   */
  now: () => 'CURRENT_TIMESTAMP',

  /**
   * Full-text search helper
   */
  fullTextSearch: (column: string, query: string) => 
    `to_tsvector('english', ${column}) @@ plainto_tsquery('english', $1)`,

  /**
   * JSON operations
   */
  jsonContains: (column: string, path: string) =>
    `${column}::jsonb @> $1`,

  /**
   * Array operations
   */
  arrayContains: (column: string) =>
    `$1 = ANY(${column})`,

  /**
   * Case-insensitive search
   */
  ilike: (column: string) =>
    `${column} ILIKE $1`,
};

export default {
  query,
  getClient,
  transaction,
  setCurrentUser,
  setCurrentOrganization,
  closePool,
  isHealthy,
  postgres,
};

