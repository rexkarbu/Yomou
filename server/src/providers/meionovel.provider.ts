/**
 * Meionovels Scraper Provider Implementation
 * Strictly compliant with PRD.md Section 3.5 & 10 and scraper-resilience guidelines
 */

import type { INovelProvider } from '../interfaces/provider.interface.js';
import type { NovelSummary, NovelDetail, ChapterDetail, ChapterSummary } from '../types/novel.js';
import { ResilientHttpClient, httpClient } from '../services/httpClient.js';
import {
  parseLatestFeed,
  parsePopularFeed,
  parseSearchFeed,
  parseNovelMetadata,
  parseNovelChapters,
  validateNovelSlug,
  validateChapterSlug,
  extractNovelSlug,
  extractChapterSlug,
  extractChapterContent,
} from '../utils/parser.js';
import { ProviderError } from '../errors/provider.error.js';
import * as cheerio from 'cheerio';

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
   * URL: https://meionovels.com/?s={query}&post_type=wp-manga
   */
  async search(query: string, page: number = 1): Promise<NovelSummary[]> {
    if (!query || typeof query !== 'string' || !query.trim()) {
      return [];
    }
    const cleanQuery = query.trim();
    const pageNum = Number.isSafeInteger(page) && page > 0 ? page : 1;
    const url =
      pageNum <= 1
        ? `${this.baseUrl}/?s=${encodeURIComponent(cleanQuery)}&post_type=wp-manga`
        : `${this.baseUrl}/page/${pageNum}/?s=${encodeURIComponent(cleanQuery)}&post_type=wp-manga`;

    const response = await this.client.get<string>(url);
    return parseSearchFeed(response.data, this.baseUrl);
  }

  /**
   * Mengambil metadata lengkap novel beserta seluruh daftar bab (kronologis).
   * Menegakkan batas waktu total operasi 8 detik untuk gabungan metadata + AJAX chapters.
   *
   * @param novelId Slug novel (misal: 'kimi-wa-boku-no-koukai-ln', 'btth')
   */
  async getNovelDetails(novelId: string, options?: { totalTimeoutMs?: number }): Promise<NovelDetail> {
    const validId = validateNovelSlug(novelId);
    const totalTimeoutMs = options?.totalTimeoutMs ?? 8000;
    const startTime = Date.now();

    const mainUrl = `${this.baseUrl}/novel/${validId}/`;
    const metadataResponse = await this.client.get<string>(mainUrl, { totalTimeoutMs });

    const metadata = parseNovelMetadata(metadataResponse.data, validId, this.baseUrl);

    // Compute remaining time for chapter list request (Correction 2)
    const elapsedMs = Date.now() - startTime;
    const remainingMs = totalTimeoutMs - elapsedMs;

    if (remainingMs <= 0) {
      throw new ProviderError(
        'PROVIDER_TIMEOUT',
        `Total operation deadline of ${totalTimeoutMs}ms exceeded before fetching chapter list for "${validId}"`,
        504,
        { novelId: validId, totalTimeoutMs, elapsedMs }
      );
    }

    // Check if chapter elements already exist in main page DOM (fallback for static layouts)
    const $ = cheerio.load(metadataResponse.data);
    let chapters: ChapterSummary[];

    if ($('.wp-manga-chapter').length > 0) {
      chapters = parseNovelChapters(metadataResponse.data, validId, this.baseUrl);
    } else {
      // Fetch via AJAX endpoint (Meionovels Madara theme)
      const ajaxUrl = `${this.baseUrl}/novel/${validId}/ajax/chapters/`;
      const chapterResponse = await this.client.post<string>(ajaxUrl, '', {
        totalTimeoutMs: remainingMs,
        allowRetry: true, // Idempotent read endpoint verified
        headers: {
          'x-requested-with': 'XMLHttpRequest',
        },
      });

      chapters = parseNovelChapters(chapterResponse.data, validId, this.baseUrl);
    }

    const latestChapter = chapters.length > 0 ? chapters[chapters.length - 1] : undefined;

    return {
      ...metadata,
      totalChapters: chapters.length,
      latestChapter,
      chapters,
    };
  }

  /**
   * Mengambil isi bab novel yang telah disanitasi menjadi ContentBlock[]
   * Strictly compliant with PRD Section 3.1, 7, 8.3 & SLA-NAV-03
   */
  async getChapterContent(
    novelId: string,
    chapterId: string,
    options?: { totalTimeoutMs?: number }
  ): Promise<ChapterDetail> {
    const validNovelId = validateNovelSlug(novelId);
    const validChapterId = validateChapterSlug(chapterId);

    const totalTimeoutMs = options?.totalTimeoutMs ?? 8000;
    const baseOrigin = new URL(this.baseUrl).origin.toLowerCase();

    // Preserves canonical subpaths (e.g. 'mtl/chapter-1') without mutating input
    const chapterUrl = `${this.baseUrl}/novel/${validNovelId}/${validChapterId}/`;

    const response = await this.client.get<string>(chapterUrl, {
      totalTimeoutMs,
      headers: {
        Referer: `${this.baseUrl}/novel/${validNovelId}/`,
      },
      beforeRedirect: (redirectOptions: Record<string, any>) => {
        const targetOrigin = `${redirectOptions.protocol || 'https:'}//${redirectOptions.hostname}${
          redirectOptions.port ? `:${redirectOptions.port}` : ''
        }`.toLowerCase();

        if (targetOrigin !== baseOrigin) {
          throw new ProviderError(
            'SCRAPER_PARSE_ERROR',
            `Cross-origin redirect rejected: "${targetOrigin}" does not match "${baseOrigin}"`,
            500,
            { url: chapterUrl, targetOrigin }
          );
        }
      },
    });

    // Validate final URL and identity of requested chapter
    if (response.finalUrl) {
      let finalParsed: URL;
      try {
        finalParsed = new URL(response.finalUrl);
      } catch {
        throw new ProviderError(
          'SCRAPER_PARSE_ERROR',
          `Invalid final URL received from upstream: "${response.finalUrl}"`,
          500
        );
      }

      // Check origin
      if (finalParsed.origin.toLowerCase() !== baseOrigin) {
        throw new ProviderError(
          'SCRAPER_PARSE_ERROR',
          `Cross-origin final URL received: "${response.finalUrl}"`,
          500
        );
      }

      // Check if redirected to novel page or home page (soft-404)
      const finalNovelSlug = extractNovelSlug(finalParsed.pathname);
      const finalChapterSlug = extractChapterSlug(finalParsed.pathname, validNovelId);

      if (finalNovelSlug === validNovelId && !finalChapterSlug) {
        // Redirected to novel detail page without chapter segment -> chapter does not exist
        throw new ProviderError(
          'PROVIDER_NOT_FOUND',
          `Chapter "${validChapterId}" not found for novel "${validNovelId}" (redirected to novel page)`,
          404,
          { novelId: validNovelId, chapterId: validChapterId, finalUrl: response.finalUrl }
        );
      }

      if (finalNovelSlug !== validNovelId) {
        throw new ProviderError(
          'SCRAPER_PARSE_ERROR',
          `Upstream redirected requested novel "${validNovelId}" to different novel "${finalNovelSlug}"`,
          500,
          { novelId: validNovelId, chapterId: validChapterId, finalUrl: response.finalUrl }
        );
      }

      if (finalChapterSlug && finalChapterSlug !== validChapterId) {
        throw new ProviderError(
          'SCRAPER_PARSE_ERROR',
          `Upstream redirected requested chapter "${validChapterId}" to different chapter "${finalChapterSlug}"`,
          500,
          { novelId: validNovelId, chapterId: validChapterId, finalUrl: response.finalUrl }
        );
      }
    }

    return extractChapterContent(response.data, {
      novelId: validNovelId,
      chapterId: validChapterId,
      baseUrl: this.baseUrl,
      chapterPageUrl: response.finalUrl || chapterUrl,
    });
  }
}

export const meionovelProvider = new MeionovelProvider();
