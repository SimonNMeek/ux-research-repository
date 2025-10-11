/**
 * Database Compatibility Layer
 * Provides backward compatibility for routes that still use getDb()
 * This will be removed once all routes are migrated to the adapter
 */

import { getDbAdapter, getDbType } from './adapter';

// Create a compatibility wrapper that looks like better-sqlite3 Database
export function getDb() {
  const adapter = getDbAdapter();
  const dbType = getDbType();
  
  // Create a mock database object that implements the same interface
  const mockDb = {
    prepare: (sql: string) => {
      return {
        get: (params: any[] = []) => {
          if (dbType === 'postgres') {
            // Convert SQLite params (?) to PostgreSQL params ($1, $2, etc.)
            const convertedSql = sql.replace(/\?/g, (match, offset) => {
              const paramIndex = sql.substring(0, offset).split('?').length;
              return `$${paramIndex}`;
            });
            return adapter.query(convertedSql, params).then(result => result.rows[0]);
          } else {
            return adapter.prepare(sql).get(params);
          }
        },
        all: (params: any[] = []) => {
          if (dbType === 'postgres') {
            // Convert SQLite params (?) to PostgreSQL params ($1, $2, etc.)
            const convertedSql = sql.replace(/\?/g, (match, offset) => {
              const paramIndex = sql.substring(0, offset).split('?').length;
              return `$${paramIndex}`;
            });
            return adapter.query(convertedSql, params).then(result => result.rows);
          } else {
            return adapter.prepare(sql).all(params);
          }
        },
        run: (params: any[] = []) => {
          if (dbType === 'postgres') {
            // Convert SQLite params (?) to PostgreSQL params ($1, $2, etc.)
            const convertedSql = sql.replace(/\?/g, (match, offset) => {
              const paramIndex = sql.substring(0, offset).split('?').length;
              return `$${paramIndex}`;
            });
            return adapter.query(convertedSql, params).then(result => ({
              lastInsertRowid: result.rows[0]?.id,
              changes: result.rowCount || 0
            }));
          } else {
            return adapter.prepare(sql).run(params);
          }
        }
      };
    },
    exec: (sql: string) => {
      if (dbType === 'postgres') {
        return adapter.query(sql).then(() => undefined);
      } else {
        // For SQLite, exec doesn't return anything
        return adapter.query(sql).then(() => undefined);
      }
    },
    transaction: (callback: (db: any) => any) => {
      if (dbType === 'postgres') {
        return adapter.transaction(callback);
      } else {
        // For SQLite, transactions are synchronous
        return callback(mockDb);
      }
    }
  };
  
  return mockDb as any;
}
