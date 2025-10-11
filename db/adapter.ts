/**
 * Database Adapter
 * Unified interface that works with both SQLite (dev) and PostgreSQL (production)
 * Automatically selects the appropriate database based on environment
 */

import Database from 'better-sqlite3';
import { Pool, PoolClient } from 'pg';
import { getPostgresPool, query as pgQuery, getClient as pgGetClient, transaction as pgTransaction } from './postgres';
import { getDb as getSqliteDb } from './index';

export type DbType = 'sqlite' | 'postgres';

/**
 * Determine which database to use based on environment
 */
export function getDbType(): DbType {
  return process.env.DATABASE_URL ? 'postgres' : 'sqlite';
}

/**
 * Unified query result interface
 */
export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

/**
 * Unified database interface
 */
export interface DbAdapter {
  type: DbType;
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> | QueryResult<T>;
  prepare(sql: string): StatementAdapter;
  transaction<T>(callback: (adapter: DbAdapter) => Promise<T> | T): Promise<T>;
  close(): Promise<void> | void;
}

/**
 * Unified statement interface
 */
export interface StatementAdapter {
  get<T = any>(params: any[]): T | undefined;
  all<T = any>(params: any[]): T[];
  run(params: any[]): { lastInsertRowid?: number | bigint; changes?: number };
}

/**
 * SQLite Adapter Implementation
 */
class SQLiteAdapter implements DbAdapter {
  type: DbType = 'sqlite';
  private db: Database.Database;

  constructor() {
    this.db = getSqliteDb();
  }

  query<T = any>(sql: string, params: any[] = []): QueryResult<T> {
    const stmt = this.db.prepare(sql);
    const rows = params.length > 0 ? stmt.all(...params) : stmt.all();
    return {
      rows: rows as T[],
      rowCount: rows.length
    };
  }

  prepare(sql: string): StatementAdapter {
    const stmt = this.db.prepare(sql);
    return {
      get: <T = any>(params: any[]) => stmt.get(...params) as T | undefined,
      all: <T = any>(params: any[]) => stmt.all(...params) as T[],
      run: (params: any[]) => {
        const result = stmt.run(...params);
        return {
          lastInsertRowid: result.lastInsertRowid,
          changes: result.changes
        };
      }
    };
  }

  transaction<T>(callback: (adapter: DbAdapter) => T): T {
    // SQLite doesn't need async transactions for this use case
    return this.db.transaction(() => callback(this))();
  }

  close(): void {
    this.db.close();
  }
}

/**
 * PostgreSQL Adapter Implementation
 */
class PostgresAdapter implements DbAdapter {
  type: DbType = 'postgres';
  private client?: PoolClient;

  constructor(client?: PoolClient) {
    this.client = client;
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    const result = this.client 
      ? await this.client.query(sql, params)
      : await pgQuery(sql, params);
    
    return {
      rows: result.rows as T[],
      rowCount: result.rowCount || 0
    };
  }

  prepare(sql: string): StatementAdapter {
    return {
      get: async <T = any>(params: any[]) => {
        const result = await this.query<T>(sql, params);
        return result.rows[0];
      },
      all: async <T = any>(params: any[]) => {
        const result = await this.query<T>(sql, params);
        return result.rows;
      },
      run: async (params: any[]) => {
        const result = this.client 
          ? await this.client.query(sql, params)
          : await pgQuery(sql, params);
        
        // PostgreSQL uses RETURNING to get last inserted ID
        return {
          lastInsertRowid: result.rows[0]?.id,
          changes: result.rowCount || 0
        };
      }
    };
  }

  async transaction<T>(callback: (adapter: DbAdapter) => Promise<T>): Promise<T> {
    return await pgTransaction(async (client) => {
      const adapter = new PostgresAdapter(client);
      return await callback(adapter);
    });
  }

  async close(): Promise<void> {
    if (this.client) {
      this.client.release();
    }
  }
}

/**
 * Get the appropriate database adapter
 */
export function getDbAdapter(): DbAdapter {
  const dbType = getDbType();
  
  if (dbType === 'postgres') {
    return new PostgresAdapter();
  } else {
    return new SQLiteAdapter();
  }
}

/**
 * SQL Query Builder Helpers
 * Automatically generates the correct SQL for the current database
 */
export const SQL = {
  /**
   * Get the correct syntax for RETURNING clause
   */
  returning: (columns: string = '*'): string => {
    return getDbType() === 'postgres' ? `RETURNING ${columns}` : '';
  },

  /**
   * Get the correct syntax for INSERT and get ID
   */
  insertReturning: (table: string, columns: string[], values: string): string => {
    const cols = columns.join(', ');
    if (getDbType() === 'postgres') {
      return `INSERT INTO ${table} (${cols}) VALUES (${values}) RETURNING *`;
    } else {
      return `INSERT INTO ${table} (${cols}) VALUES (${values})`;
    }
  },

  /**
   * Get current timestamp
   */
  now: (): string => {
    return getDbType() === 'postgres' ? 'CURRENT_TIMESTAMP' : 'CURRENT_TIMESTAMP';
  },

  /**
   * Boolean type
   */
  boolean: (value: boolean): string | number => {
    return getDbType() === 'postgres' ? value : (value ? 1 : 0);
  },

  /**
   * JSON column type
   */
  jsonType: (): string => {
    return getDbType() === 'postgres' ? 'JSONB' : 'TEXT';
  },

  /**
   * Parse JSON value
   */
  parseJson: (value: any): any => {
    if (getDbType() === 'postgres') {
      return value; // Postgres returns parsed JSON
    } else {
      return typeof value === 'string' ? JSON.parse(value) : value;
    }
  },

  /**
   * Stringify JSON value for insertion
   */
  stringifyJson: (value: any): string => {
    return JSON.stringify(value);
  },

  /**
   * LIMIT clause with OFFSET
   */
  limit: (limit: number, offset: number = 0): string => {
    return `LIMIT ${limit} OFFSET ${offset}`;
  },

  /**
   * Full-text search
   */
  fullTextSearch: (column: string, query: string): string => {
    if (getDbType() === 'postgres') {
      return `to_tsvector('english', ${column}) @@ plainto_tsquery('english', $1)`;
    } else {
      return `${column} LIKE '%' || ? || '%'`;
    }
  },

  /**
   * Case-insensitive LIKE
   */
  ilike: (column: string): string => {
    if (getDbType() === 'postgres') {
      return `${column} ILIKE $1`;
    } else {
      return `${column} LIKE ?`;
    }
  },

  /**
   * Parameter placeholder (? for SQLite, $1 for Postgres)
   */
  param: (index: number): string => {
    return getDbType() === 'postgres' ? `$${index}` : '?';
  }
};

export default {
  getDbType,
  getDbAdapter,
  SQL
};

