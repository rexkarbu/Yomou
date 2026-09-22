/**
 * Local SQLite Database Service
 * Uses expo-sqlite to provide an ACID relational storage layer for YomouNovel
 * Reference: PRD.md Section 6
 */

import * as SQLite from 'expo-sqlite';
import { ALL_MIGRATIONS, SCHEMA_SQL } from './schema';

export const DATABASE_NAME = 'yomou.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Performs database opening and schema migration with automatic rollback/cleanup on error.
 */
async function performDatabaseInit(dbName: string): Promise<SQLite.SQLiteDatabase> {
  let openedDb: SQLite.SQLiteDatabase | null = null;
  try {
    openedDb = await SQLite.openDatabaseAsync(dbName);

    // Enable foreign key enforcement
    await openedDb.execAsync(SCHEMA_SQL.enableForeignKeys);

    // Execute DDL schema migrations sequentially
    for (const sql of ALL_MIGRATIONS) {
      await openedDb.execAsync(sql);
    }

    dbInstance = openedDb;
    return openedDb;
  } catch (error) {
    if (openedDb) {
      try {
        await openedDb.closeAsync();
      } catch {
        // Suppress secondary error when closing a broken handle
      }
    }
    dbInstance = null;
    throw error;
  }
}

/**
 * Returns the active SQLite database instance.
 * Concurrent callers share the exact same in-flight initialization promise.
 * If initialization fails, any opened connection is closed, the instance is cleared,
 * and subsequent attempts are allowed.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }
  if (!initPromise) {
    initPromise = performDatabaseInit(DATABASE_NAME).finally(() => {
      initPromise = null;
    });
  }
  return await initPromise;
}

/**
 * Opens and initializes the database with all composite-key tables and indexes.
 * Idempotent: safe to run multiple times without data loss.
 */
export async function initDatabase(dbName = DATABASE_NAME): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance && dbName === DATABASE_NAME) {
    return dbInstance;
  }
  if (initPromise && dbName === DATABASE_NAME) {
    return await initPromise;
  }

  const promise = performDatabaseInit(dbName);
  if (dbName === DATABASE_NAME) {
    initPromise = promise.finally(() => {
      initPromise = null;
    });
    return await initPromise;
  }
  return await promise;
}

/**
 * Closes the active database connection if open and resets shared state.
 */
export async function closeDatabase(): Promise<void> {
  const db = dbInstance;
  dbInstance = null;
  initPromise = null;
  if (db) {
    await db.closeAsync();
  }
}

