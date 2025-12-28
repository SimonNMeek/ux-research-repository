/**
 * Unified database query helper
 * Works with both SQLite and PostgreSQL
 * Automatically converts parameter placeholders ($1, $2 -> ? for SQLite)
 */

import { getDbAdapter, getDbType, QueryResult } from '@/db/adapter';

/**
 * Convert PostgreSQL parameter placeholders ($1, $2, ...) to SQLite placeholders (?)
 * Also converts boolean literals (true/false) to SQLite format (1/0)
 */
function convertPlaceholders(sql: string): string {
  const dbType = getDbType();
  if (dbType === 'postgres') {
    return sql; // Already in PostgreSQL format
  }
  
  // Convert $1, $2, $3... to ? (SQLite uses ? for all parameters)
  // Replace $1, $2, etc. with ? (handle up to 99 parameters)
  // Use String.raw to ensure proper escaping in template literal
  let converted = sql;
  for (let i = 99; i >= 1; i--) {
    const pattern = String.raw`\$${i}`;
    converted = converted.replace(new RegExp(pattern, 'g'), '?');
  }
  
  // Convert boolean literals to SQLite format (true -> 1, false -> 0)
  // But be careful - only replace whole words, not inside strings
  converted = converted.replace(/\btrue\b/gi, '1');
  converted = converted.replace(/\bfalse\b/gi, '0');
  
  return converted;
}

/**
 * Check if SQL statement returns data (SELECT) or modifies data (UPDATE/INSERT/DELETE)
 */
function isSelectStatement(sql: string): boolean {
  const trimmed = sql.trim().toUpperCase();
  return trimmed.startsWith('SELECT');
}

/**
 * Unified query function that works with both SQLite and PostgreSQL
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const adapter = getDbAdapter();
  const convertedSql = convertPlaceholders(text);
  const paramArray = params || [];
  
  // For SQLite, UPDATE/INSERT/DELETE need .run() instead of .all()
  if (adapter.type === 'sqlite' && !isSelectStatement(convertedSql)) {
    const stmt = adapter.prepare(convertedSql);
    const result = stmt.run(...paramArray);
    return Promise.resolve({
      rows: [] as T[],
      rowCount: result.changes || 0,
    });
  }
  
  // For SELECT statements or PostgreSQL, use the normal query method
  const result = adapter.query<T>(convertedSql, paramArray);
  
  // SQLite adapter returns synchronously, PostgreSQL returns a Promise
  if (result instanceof Promise) {
    return await result;
  }
  
  // For SQLite, wrap synchronous result in Promise
  return Promise.resolve(result as QueryResult<T>);
}

