/**
 * Novel & Chapter Entity Types
 * Reference: PRD.md Section 6.2 & Section 8.3
 */

import type { ContentBlock } from './blocks';

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
  /**
   * Slug / subjalur URL bab unik per novel (misal: 'volume-4-chapter-14' atau 'mtl/chapter-1648-tamat').
   * Catatan encoding: Jika bab mengandung garis miring ('/'), nilai ID harus di-encode
   * (encodeURIComponent) pada parameter endpoint REST API (e.g. :chapterId) agar tidak terpecah menjadi segmen rute terpisah.
   */
  id: string;
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
  /**
   * Slug / subjalur URL bab unik per novel (misal: 'volume-4-chapter-14' atau 'mtl/chapter-1648-tamat').
   */
  id: string;
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
