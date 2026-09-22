export * from './schema';
export * from './types';
export * from './sqlite';
export * from './filesystem';

import { initFileSystemDirs } from './filesystem';
import { initDatabase } from './sqlite';

/**
 * Initializes client storage subsystems (filesystem directories and SQLite database).
 * Idempotent and safe to run on app startup.
 */
export async function initStorage(): Promise<void> {
  await initFileSystemDirs();
  await initDatabase();
}
