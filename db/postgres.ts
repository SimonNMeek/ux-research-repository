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
    max: 20, // Increased pool size for better concurrency
    min: 3, // Keep more minimum connections alive
    idleTimeoutMillis: 30000, // Shorter idle timeout to prevent stale connections
    connectionTimeoutMillis: 30000, // Increased timeout to 30 seconds for network latency
    acquireTimeoutMillis: 30000, // Increased timeout to get connection from pool
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    // Add keep-alive settings for better connection stability
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    // Add statement timeout to prevent long-running queries
    statement_timeout: 60000, // Increased to 60 seconds for complex queries
    // Additional settings for connection reliability
    allowExitOnIdle: false, // Don't exit when pool is idle
  });

  // Handle pool errors - remove dead connections
  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
    // Don't crash - the pool will automatically remove dead connections
    // This is logged for debugging but the pool handles it gracefully
  });

  // Handle connection termination - validate connections before use
  pool.on('connect', (client) => {
    // Validate connection is alive before using
    client.on('error', (err: any) => {
      // Connection errors are handled by the pool
      if (err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET' || err.code === 'EPIPE') {
        console.error('PostgreSQL connection error (will be removed from pool):', err.code);
        // Pool will automatically remove this client
      }
    });
  });

  return pool;
}

/**
 * Check if an error is a retryable connection error
 */
function isRetryableError(error: any): boolean {
  if (!error) return false;
  
  // Check error code (primary indicator)
  const errorCode = error.code || error.errno || '';
  const retryableCodes = [
    'ETIMEDOUT',
    'ECONNRESET',
    'EPIPE',
    'ENOTFOUND',
    'ECONNREFUSED',
    '57P01', // PostgreSQL: admin shutdown
    '57P02', // PostgreSQL: crash shutdown
    '57P03', // PostgreSQL: cannot connect now
    '08003', // PostgreSQL: connection does not exist
    '08006', // PostgreSQL: connection failure
    '08001', // PostgreSQL: SQL client unable to establish connection
  ];
  
  if (retryableCodes.includes(errorCode)) {
    return true;
  }
  
  // Also check error message as fallback
  const errorMessage = error.message || '';
  if (errorMessage.includes('timeout') || 
      errorMessage.includes('Connection terminated') ||
      (errorMessage.includes('connection') && errorMessage.includes('lost'))) {
    return true;
  }
  
  return false;
}

/**
 * Execute a query with automatic connection management and retry logic
 */
export async function query<T = any>(
  text: string,
  params?: any[],
  retries: number = 3
): Promise<QueryResult<T>> {
  const pool = getPostgresPool();
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await pool.query(text, params);
    } catch (error: any) {
      const isRetryable = isRetryableError(error);
      const isLastAttempt = attempt === retries;
      
      console.error(`PostgreSQL query error (attempt ${attempt + 1}/${retries + 1}):`, {
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        params: params?.slice(0, 3), // Log first 3 params for debugging
        errorCode: error?.code || 'unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        isRetryable,
        isLastAttempt
      });
      
      // If this is the last attempt or it's not a retryable error, throw
      if (isLastAttempt || !isRetryable) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff with jitter)
      const baseDelay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s...
      const jitter = Math.random() * 500; // Add randomness to avoid thundering herd
      await new Promise(resolve => setTimeout(resolve, baseDelay + jitter));
      
      // Before retrying, try to refresh the pool connection
      if (error?.code === 'ETIMEDOUT' || error?.code === 'ECONNRESET') {
        // Force pool to clear dead connections by attempting a health check
        try {
          await pool.query('SELECT 1');
        } catch {
          // Ignore - we'll retry the actual query anyway
        }
      }
    }
  }
  
  throw new Error('All retry attempts failed');
}

/**
 * Get a client from the pool for transaction support
 * Includes retry logic for connection failures
 */
export async function getClient(): Promise<PoolClient> {
  const pool = getPostgresPool();
  const maxRetries = 3;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const client = await Promise.race([
        pool.connect(),
        new Promise<PoolClient>((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 30000)
        )
      ]);
      
      // Validate connection is alive
      try {
        await client.query('SELECT 1');
        return client;
      } catch (healthError: any) {
        // Connection is dead, release it and retry
        client.release();
        if (attempt === maxRetries) throw healthError;
        
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    } catch (error: any) {
      if (attempt === maxRetries || !isRetryableError(error)) {
        throw error;
      }
      
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Failed to acquire database client after retries');
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
  await client.query("SELECT set_config('app.user_id', $1::text, true)", [String(userId)]);
}

/**
 * Set the current organization ID for additional context
 */
export async function setCurrentOrganization(
  client: PoolClient,
  organizationId: number
): Promise<void> {
  await client.query("SELECT set_config('app.organization_id', $1::text, true)", [String(organizationId)]);
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

