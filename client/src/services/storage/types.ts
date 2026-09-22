/**
 * Local SQLite Record & Storage Model Types
 * Reference: PRD.md Section 6
 * Note: Storage models preserve client-specific fields like local_file_path and local_cover_path
 */

export interface LocalNovelRecord {
  id: string; // Slug URL sumber
  title: string;
  author: string | null;
  cover_url: string;
  local_cover_path: string | null;
  synopsis: string | null;
  genres: string | null; // JSON string array, e.g. '["Action","Romance"]'
  status: string | null; // 'Ongoing' | 'Completed'
  total_chapters: number;
  is_bookmarked: 0 | 1;
  created_at: number; // Unix epoch ms
  updated_at: number; // Unix epoch ms
}

export interface LocalChapterRecord {
  novel_id: string; // Foreign key ke novels.id
  id: string; // Slug URL bab unik per novel
  title: string;
  chapter_number: number | null;
  release_date: string | null;
  content_blocks: string | null; // JSON serialized ContentBlock[]
  download_status: 'NOT_DOWNLOADED' | 'DOWNLOADED';
  downloaded_at: number | null; // Unix epoch ms
}

export interface LocalChapterImageRecord {
  novel_id: string; // Foreign key
  chapter_id: string; // Foreign key
  image_id: string; // e.g. 'img_01'
  remote_url: string;
  local_file_path: string | null; // Local filesystem path
  download_status: 'PENDING' | 'DOWNLOADED' | 'FAILED';
}

export interface LocalChapterReadingProgressRecord {
  novel_id: string; // Foreign key
  chapter_id: string; // Foreign key
  anchor_block_index: number;
  is_completed: 0 | 1;
  updated_at: number; // Unix epoch ms
}

export interface LocalDownloadQueueRecord {
  id: string; // UUID pekerjaan unduhan
  novel_id: string; // Foreign key
  chapter_id: string; // Foreign key
  status: 'QUEUED' | 'DOWNLOADING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  retry_count: number;
  next_retry_at: number | null; // Unix epoch ms
  error_message: string | null;
  created_at: number; // Unix epoch ms
  updated_at: number; // Unix epoch ms
}

export interface LocalReaderSettingRecord {
  key: string;
  value: string; // Serialized string value
  updated_at: number;
}
