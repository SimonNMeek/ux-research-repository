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
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection cannot be established
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  // Handle pool errors
  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
  });

  return pool;
}

/**
 * Execute a query with automatic connection management
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const pool = getPostgresPool();
  return await pool.query(text, params);
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

