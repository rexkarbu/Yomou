/**
 * SQLite Database Schema & DDL Definitions
 * Reference: PRD.md Section 6 (Data Models & Local SQLite Schema)
 */

export const SCHEMA_SQL = {
  enableForeignKeys: 'PRAGMA foreign_keys = ON;',

  createNovelsTable: `
    CREATE TABLE IF NOT EXISTS novels (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT,
      cover_url TEXT NOT NULL,
      local_cover_path TEXT,
      synopsis TEXT,
      genres TEXT,
      status TEXT,
      total_chapters INTEGER DEFAULT 0,
      is_bookmarked INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `,

  createChaptersTable: `
    CREATE TABLE IF NOT EXISTS chapters (
      novel_id TEXT NOT NULL,
      id TEXT NOT NULL,
      title TEXT NOT NULL,
      chapter_number REAL,
      release_date TEXT,
      content_blocks TEXT,
      download_status TEXT DEFAULT 'NOT_DOWNLOADED',
      downloaded_at INTEGER,
      PRIMARY KEY (novel_id, id),
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
    );
  `,

  createChapterImagesTable: `
    CREATE TABLE IF NOT EXISTS chapter_images (
      novel_id TEXT NOT NULL,
      chapter_id TEXT NOT NULL,
      image_id TEXT NOT NULL,
      remote_url TEXT NOT NULL,
      local_file_path TEXT,
      download_status TEXT DEFAULT 'PENDING',
      PRIMARY KEY (novel_id, chapter_id, image_id),
      FOREIGN KEY (novel_id, chapter_id) REFERENCES chapters(novel_id, id) ON DELETE CASCADE
    );
  `,

  createChapterReadingProgressTable: `
    CREATE TABLE IF NOT EXISTS chapter_reading_progress (
      novel_id TEXT NOT NULL,
      chapter_id TEXT NOT NULL,
      anchor_block_index INTEGER DEFAULT 0,
      is_completed INTEGER DEFAULT 0,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (novel_id, chapter_id),
      FOREIGN KEY (novel_id, chapter_id) REFERENCES chapters(novel_id, id) ON DELETE CASCADE
    );
  `,

  createDownloadQueueTable: `
    CREATE TABLE IF NOT EXISTS download_queue (
      id TEXT PRIMARY KEY,
      novel_id TEXT NOT NULL,
      chapter_id TEXT NOT NULL,
      status TEXT NOT NULL,
      retry_count INTEGER DEFAULT 0,
      next_retry_at INTEGER,
      error_message TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (novel_id, chapter_id) REFERENCES chapters(novel_id, id) ON DELETE CASCADE
    );
  `,

  createReaderSettingsTable: `
    CREATE TABLE IF NOT EXISTS reader_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `,

  createIndexChapterImages: `
    CREATE INDEX IF NOT EXISTS idx_chapter_images_chapter ON chapter_images (novel_id, chapter_id);
  `,

  createIndexReadingProgress: `
    CREATE INDEX IF NOT EXISTS idx_reading_progress_novel ON chapter_reading_progress (novel_id, updated_at DESC);
  `,

  createIndexDownloadQueue: `
    CREATE INDEX IF NOT EXISTS idx_download_queue_status ON download_queue (status);
  `,
} as const;

export const ALL_MIGRATIONS = [
  SCHEMA_SQL.enableForeignKeys,
  SCHEMA_SQL.createNovelsTable,
  SCHEMA_SQL.createChaptersTable,
  SCHEMA_SQL.createChapterImagesTable,
  SCHEMA_SQL.createChapterReadingProgressTable,
  SCHEMA_SQL.createDownloadQueueTable,
  SCHEMA_SQL.createReaderSettingsTable,
  SCHEMA_SQL.createIndexChapterImages,
  SCHEMA_SQL.createIndexReadingProgress,
  SCHEMA_SQL.createIndexDownloadQueue,
];
