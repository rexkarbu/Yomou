/**
 * Novel & Chapter Entity Types
 * Reference: PRD.md Section 6.2 & Section 8.3
 */

import type { ContentBlock } from './blocks.js';

export type NovelStatus = 'Ongoing' | 'Completed';

export interface NovelSummary {
  id: string; // Slug URL sumber, e.g. 'kimi-wa-boku-no-koukai-ln'
  title: string;
  author?: string;
  coverUrl: string;
  synopsis?: string;
  genres?: string[];
  status?: NovelStatus;
  totalChapters?: number;
  latestChapter?: {
    id: string;
    title: string;
    chapterNumber?: number;
    releaseDate?: string;
  };
}

export interface ChapterSummary {
  id: string; // Slug URL bab unik per novel, e.g. 'volume-4-chapter-14'
  novelId: string; // Foreign key merujuk ke novel.id
  title: string;
  chapterNumber: number; // Nomor urut bab numerik
  releaseDate?: string;
}

export interface ChapterImage {
  imageId: string; // e.g. 'img_01'
  remoteUrl: string;
  alt?: string;
  caption?: string;
}

export interface ChapterDetail {
  id: string; // Slug URL bab, e.g. 'volume-4-chapter-14'
  novelId: string; // Foreign key merujuk ke novel.id
  title: string;
  chapterNumber: number;
  releaseDate?: string;
  blocks: ContentBlock[];
  images: ChapterImage[];
  prevChapterId?: string | null;
  nextChapterId?: string | null;
}

export interface NovelDetail extends NovelSummary {
  chapters: ChapterSummary[];
}
