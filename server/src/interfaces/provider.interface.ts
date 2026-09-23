/**
 * Modular Novel Provider Interface
 * Reference: PRD.md Section 3.1 & Section 8.3, tasks.md BE-01..BE-04
 */

import type { NovelSummary, NovelDetail, ChapterDetail } from '../types/novel.js';

export interface INovelProvider {
  /** Identifier name of the provider (e.g. 'meionovel') */
  readonly name: string;

  /** Base website URL of the upstream provider */
  readonly baseUrl: string;

  /**
   * Mengambil daftar novel terbaru dari feed pembaruan (paginated)
   * @param page Nomor halaman (1-indexed, default 1)
   */
  getLatest(page?: number): Promise<NovelSummary[]>;

  /**
   * Mengambil daftar novel populer / trending
   */
  getTrending(): Promise<NovelSummary[]>;

  /**
   * Mencari novel berdasarkan kata kunci judul atau penulis
   * @param query Kata kunci pencarian
   * @param page Nomor halaman (1-indexed, default 1)
   */
  search(query: string, page?: number): Promise<NovelSummary[]>;

  /**
   * Mengambil metadata lengkap novel beserta seluruh daftar bab
   * @param novelId Slug unik novel (misal: 'kimi-wa-boku-no-koukai-ln')
   */
  getNovelDetails(novelId: string): Promise<NovelDetail>;

  /**
   * Mengambil isi bab novel yang telah disanitasi menjadi ContentBlock[]
   * @param novelId Slug unik novel
   * @param chapterId Slug unik bab (misal: 'volume-4-chapter-14')
   */
  getChapterContent(novelId: string, chapterId: string): Promise<ChapterDetail>;
}
