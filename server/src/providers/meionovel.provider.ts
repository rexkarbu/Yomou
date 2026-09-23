/**
 * Meionovels Scraper Provider Implementation
 * Strictly compliant with PRD.md Section 3.5 & 10 and scraper-resilience guidelines
 */

import type { INovelProvider } from '../interfaces/provider.interface.js';
import type { NovelSummary, NovelDetail, ChapterDetail } from '../types/novel.js';
import { ResilientHttpClient, httpClient } from '../services/httpClient.js';
import { parseLatestFeed, parsePopularFeed } from '../utils/parser.js';
import { ProviderError } from '../errors/provider.error.js';

export const MEIONOVEL_BASE_URL = 'https://meionovels.com';

export class MeionovelProvider implements INovelProvider {
  readonly name = 'meionovel';
  readonly baseUrl: string;
  private readonly client: ResilientHttpClient;

  constructor(baseUrl: string = MEIONOVEL_BASE_URL, client: ResilientHttpClient = httpClient) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.client = client;
  }

  /**
   * Mengambil daftar novel terbaru dari feed pembaruan Meionovels (paginated)
   * Mengambil artikel .page-item-detail dari https://meionovels.com/ (page 1)
   * atau https://meionovels.com/page/{page}/
   */
  async getLatest(page: number = 1): Promise<NovelSummary[]> {
    const pageNum = Number.isSafeInteger(page) && page > 0 ? page : 1;
    const url = pageNum <= 1 ? `${this.baseUrl}/` : `${this.baseUrl}/page/${pageNum}/`;

    const response = await this.client.get<string>(url);
    return parseLatestFeed(response.data, this.baseUrl);
  }

  /**
   * Mengambil daftar novel populer / trending dari Meionovels
   * URL: https://meionovels.com/novel/?m_orderby=views
   */
  async getTrending(): Promise<NovelSummary[]> {
    const url = `${this.baseUrl}/novel/?m_orderby=views`;

    const response = await this.client.get<string>(url);
    return parsePopularFeed(response.data, this.baseUrl);
  }

  /**
   * Mencari novel berdasarkan kata kunci judul atau penulis
   * Catatan: Dijadwalkan pada BE-03.
   */
  async search(query: string, page?: number): Promise<NovelSummary[]> {
    throw new ProviderError(
      'INTERNAL_SERVER_ERROR',
      `Method search() is not yet implemented (scheduled for BE-03): query="${query}", page=${page ?? 1}`,
      501
    );
  }

  /**
   * Mengambil metadata lengkap novel beserta seluruh daftar bab
   * Catatan: Dijadwalkan pada BE-03.
   */
  async getNovelDetails(novelId: string): Promise<NovelDetail> {
    throw new ProviderError(
      'INTERNAL_SERVER_ERROR',
      `Method getNovelDetails() is not yet implemented (scheduled for BE-03): novelId="${novelId}"`,
      501
    );
  }

  /**
   * Mengambil isi bab novel yang telah disanitasi menjadi ContentBlock[]
   * Catatan: Dijadwalkan pada BE-04.
   */
  async getChapterContent(novelId: string, chapterId: string): Promise<ChapterDetail> {
    throw new ProviderError(
      'INTERNAL_SERVER_ERROR',
      `Method getChapterContent() is not yet implemented (scheduled for BE-04): novelId="${novelId}", chapterId="${chapterId}"`,
      501
    );
  }
}

export const meionovelProvider = new MeionovelProvider();
