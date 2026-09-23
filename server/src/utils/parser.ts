/**
 * Meionovels HTML Parser Utility
 * Strictly compliant with PRD.md Section 3.5 & 10 and scraper-resilience guidelines
 */

import * as cheerio from 'cheerio';
import type { NovelSummary } from '../types/novel.js';
import { ProviderError } from '../errors/provider.error.js';

export type FeedType = 'latest' | 'popular';

/**
 * Extracts a clean novel slug from a novel URL or path.
 * Strips domain, query parameters, and '/novel/' prefix.
 * Example: 'https://meionovels.com/novel/kimi-wa-boku-no-koukai-ln/' -> 'kimi-wa-boku-no-koukai-ln'
 */
export function extractNovelSlug(urlOrPath: string): string | null {
  if (!urlOrPath || typeof urlOrPath !== 'string') return null;
  const match = urlOrPath.match(/\/novel\/([^/?#]+)/i);
  return match && match[1] ? match[1].trim() : null;
}

/**
 * Extracts a clean chapter slug from a chapter URL or path.
 * Example: 'https://meionovels.com/novel/btth/mtl/chapter-1648-tamat/' -> 'chapter-1648-tamat'
 */
export function extractChapterSlug(urlOrPath: string): string {
  if (!urlOrPath || typeof urlOrPath !== 'string') return '';
  const clean = urlOrPath.replace(/[?#].*$/, '').replace(/\/+$/, '');
  const parts = clean.split('/').filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : '';
}

/**
 * Extracts numeric chapter number from chapter title text.
 * Examples:
 * - 'Chapter 1001' -> 1001
 * - 'Chapter 1648 Tamat' -> 1648
 * - 'Volume 4 Chapter 14' -> 14
 */
export function extractChapterNumber(text: string): number | undefined {
  if (!text || typeof text !== 'string') return undefined;
  const match = text.match(/(?:chapter|ch\.?|bab)\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (match && match[1]) {
    const val = parseFloat(match[1]);
    return Number.isFinite(val) ? val : undefined;
  }
  const fallback = text.match(/\b([0-9]+(?:\.[0-9]+)?)\b/);
  if (fallback && fallback[1]) {
    const val = parseFloat(fallback[1]);
    return Number.isFinite(val) ? val : undefined;
  }
  return undefined;
}

/**
 * Detects whether the received HTML is an anti-bot challenge or Cloudflare block page.
 */
export function detectBotChallenge(html: string): boolean {
  if (!html || typeof html !== 'string') return false;
  return (
    /<title>\s*(?:Attention Required! \| Cloudflare|Just a moment\.\.\.)\s*<\/title>/i.test(html) ||
    /class="[^"]*(?:cf-browser-verification|cf-im-under-attack)[^"]*"/i.test(html) ||
    /id="[^"]*(?:cf-challenge-running|challenge-running)[^"]*"/i.test(html) ||
    (html.includes('/cdn-cgi/challenge-platform/') &&
      !html.includes('page-item-detail') &&
      !html.includes('popular-item-wrap'))
  );
}

/**
 * Detects whether the specified feed area is a legitimate empty/out-of-bounds page
 * (e.g. WordPress Nothing Found pagination boundary).
 */
export function isKnownEmptyPage(
  $orHtml: cheerio.CheerioAPI | string,
  feedType: FeedType = 'latest'
): boolean {
  const $ = typeof $orHtml === 'string' ? cheerio.load($orHtml) : $orHtml;

  const mainScope = feedType === 'latest'
    ? $('.c-blog__content, .page-content-listing, #loop-content, .main-col')
    : $('.page-content-listing, .main-col, .c-blog__content');

  const scope = mainScope.length > 0
    ? mainScope
    : $('body').children().not('aside, .sidebar, #sidebar, .widget-area, footer, header');
  const target = scope.length > 0 ? scope : $('body');

  const hasNoResultsClass =
    target.find('.no-results, .not-found').length > 0 ||
    target.hasClass('no-results') ||
    target.hasClass('not-found');

  const hasPageTitleNothing =
    target.find('.page-title').text().includes('Nothing Found') ||
    target.find('h1, h2, h3, p').filter((_, el) => $(el).text().trim() === 'Nothing Found').length > 0;

  return hasNoResultsClass || hasPageTitleNothing;
}

/**
 * Normalizes an image URL to an absolute HTTP(S) URL.
 * Only accepts 'http:' and 'https:' protocols. Rejects forbidden schemes (javascript:, data:, etc.)
 * and unresolvable URLs by returning null.
 */
export function normalizeImageUrl(
  rawUrl: string | undefined | null,
  baseUrl: string = 'https://meionovels.com'
): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed, baseUrl);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Helper to extract NovelSummary from a .page-item-detail element.
 */
function extractFromPageItem(
  $: cheerio.CheerioAPI,
  el: any,
  baseUrl: string
): NovelSummary | null {
  const thumbA = $(el).find('.item-thumb a').first();
  const titleA = $(el).find('.post-title a').first();

  const rawNovelUrl = titleA.attr('href') || thumbA.attr('href') || '';
  const id = extractNovelSlug(rawNovelUrl);
  if (!id) return null;

  const title = titleA.text().trim() || thumbA.attr('title')?.trim() || id;

  const img = $(el).find('.item-thumb img').first();
  const rawCover =
    img.attr('data-src') ||
    img.attr('data-lazy-src') ||
    img.attr('src') ||
    '';
  const coverUrl = normalizeImageUrl(rawCover, baseUrl);
  if (!coverUrl) return null; // Reject items with invalid, relative, or dangerous covers

  const firstChapterItem = $(el).find('.list-chapter .chapter-item').first();
  let latestChapter: NovelSummary['latestChapter'] = undefined;

  if (firstChapterItem.length > 0) {
    const chA = firstChapterItem.find('.chapter a').first();
    const chTitle = chA.text().trim();
    const rawChUrl = chA.attr('href') || '';
    const chId = extractChapterSlug(rawChUrl);
    const postOn = firstChapterItem.find('.post-on').first().text().trim();
    const chNum = extractChapterNumber(chTitle);

    if (chTitle || chId) {
      latestChapter = {
        id: chId,
        title: chTitle || chId,
        chapterNumber: chNum,
        releaseDate: postOn || undefined,
      };
    }
  }

  const mangaType = $(el).find('.manga-type').first().text().trim();
  const genres = mangaType ? [mangaType] : undefined;

  return {
    id,
    title,
    coverUrl,
    genres,
    latestChapter,
  };
}

/**
 * Helper to extract NovelSummary from a .popular-item-wrap element (sidebar widget).
 */
function extractFromPopularWidget(
  $: cheerio.CheerioAPI,
  el: any,
  baseUrl: string
): NovelSummary | null {
  const thumbA = $(el).find('.popular-img a').first();
  const titleA = $(el).find('.widget-title a').first();

  const rawNovelUrl = titleA.attr('href') || thumbA.attr('href') || '';
  const id = extractNovelSlug(rawNovelUrl);
  if (!id) return null;

  const title = titleA.text().trim() || thumbA.attr('title')?.trim() || id;

  const img = $(el).find('.popular-img img').first();
  const rawCover =
    img.attr('data-src') ||
    img.attr('data-lazy-src') ||
    img.attr('src') ||
    '';
  const coverUrl = normalizeImageUrl(rawCover, baseUrl);
  if (!coverUrl) return null; // Reject items with invalid, relative, or dangerous covers

  const firstChapterItem = $(el).find('.list-chapter .chapter-item').first();
  let latestChapter: NovelSummary['latestChapter'] = undefined;

  if (firstChapterItem.length > 0) {
    const chA = firstChapterItem.find('.chapter a').first();
    const chTitle = chA.text().trim();
    const rawChUrl = chA.attr('href') || '';
    const chId = extractChapterSlug(rawChUrl);
    const postOn = firstChapterItem.find('.post-on').first().text().trim();
    const chNum = extractChapterNumber(chTitle);

    if (chTitle || chId) {
      latestChapter = {
        id: chId,
        title: chTitle || chId,
        chapterNumber: chNum,
        releaseDate: postOn || undefined,
      };
    }
  }

  return {
    id,
    title,
    coverUrl,
    latestChapter,
  };
}

/**
 * Parses latest updates novel feed HTML into an array of NovelSummary objects.
 * Strictly checks the main feed area (.c-blog__content / .page-content-listing / #loop-content).
 * NEVER falls back to the popular sidebar.
 *
 * @throws {ProviderError} PROVIDER_BLOCKED (503) if Cloudflare challenge detected
 * @throws {ProviderError} SCRAPER_PARSE_ERROR (500) if markup is corrupted or unexpected
 */
export function parseLatestFeed(html: string, baseUrl = 'https://meionovels.com'): NovelSummary[] {
  if (!html || typeof html !== 'string') {
    throw new ProviderError('SCRAPER_PARSE_ERROR', 'Empty or non-string HTML payload received', 500);
  }

  if (detectBotChallenge(html)) {
    throw new ProviderError(
      'PROVIDER_BLOCKED',
      'Upstream returned Cloudflare or bot challenge verification page',
      503
    );
  }

  const $ = cheerio.load(html);

  // Exclude sidebar from latest feed searching by targeting main content scope
  const mainScope = $('.c-blog__content, .page-content-listing, #loop-content, .main-col');
  const scope = mainScope.length > 0
    ? mainScope
    : $('body').children().not('aside, .sidebar, #sidebar, .widget-area, footer, header');
  const searchRoot = scope.length > 0 ? scope : $('body');

  const pageItems = searchRoot.find('.page-item-detail').not('aside *, .sidebar *, #sidebar *, .widget-area *');
  if (pageItems.length > 0) {
    const items: NovelSummary[] = [];
    pageItems.each((_, el) => {
      const item = extractFromPageItem($, el, baseUrl);
      if (item) items.push(item);
    });

    if (items.length === 0) {
      throw new ProviderError(
        'SCRAPER_PARSE_ERROR',
        `Latest feed container found (${pageItems.length} elements), but failed to extract any valid novel items`,
        500
      );
    }
    return items;
  }

  // Check if main feed area has legitimate Nothing Found / no-results pagination boundary
  if (isKnownEmptyPage($, 'latest')) {
    return [];
  }

  throw new ProviderError(
    'SCRAPER_PARSE_ERROR',
    'Failed to parse latest novel feed: no items matched selector .page-item-detail in main content',
    500
  );
}

/**
 * Parses popular/trending novels feed HTML into an array of NovelSummary objects.
 * Supports primary listing (.page-item-detail) with fallback to sidebar widget (.popular-item-wrap).
 *
 * @throws {ProviderError} PROVIDER_BLOCKED (503) if Cloudflare challenge detected
 * @throws {ProviderError} SCRAPER_PARSE_ERROR (500) if markup is corrupted or unexpected
 */
export function parsePopularFeed(html: string, baseUrl = 'https://meionovels.com'): NovelSummary[] {
  if (!html || typeof html !== 'string') {
    throw new ProviderError('SCRAPER_PARSE_ERROR', 'Empty or non-string HTML payload received', 500);
  }

  if (detectBotChallenge(html)) {
    throw new ProviderError(
      'PROVIDER_BLOCKED',
      'Upstream returned Cloudflare or bot challenge verification page',
      503
    );
  }

  const $ = cheerio.load(html);

  // 1. Primary popular layout: .page-item-detail (on /novel/?m_orderby=views)
  const pageItems = $('.page-content-listing .page-item-detail, .main-col .page-item-detail, .page-item-detail');
  if (pageItems.length > 0) {
    const items: NovelSummary[] = [];
    pageItems.each((_, el) => {
      const item = extractFromPageItem($, el, baseUrl);
      if (item) items.push(item);
    });

    if (items.length === 0) {
      throw new ProviderError(
        'SCRAPER_PARSE_ERROR',
        `Popular feed container found (${pageItems.length} elements), but failed to extract any valid novel items`,
        500
      );
    }
    return items;
  }

  // 2. Fallback layout: .popular-item-wrap (Verified popular sidebar widget)
  const widgetItems = $('.popular-item-wrap');
  if (widgetItems.length > 0) {
    const items: NovelSummary[] = [];
    widgetItems.each((_, el) => {
      const item = extractFromPopularWidget($, el, baseUrl);
      if (item) items.push(item);
    });

    if (items.length === 0) {
      throw new ProviderError(
        'SCRAPER_PARSE_ERROR',
        `Popular sidebar widget found (${widgetItems.length} elements), but failed to extract any valid novel items`,
        500
      );
    }
    return items;
  }

  if (isKnownEmptyPage($, 'popular')) {
    return [];
  }

  throw new ProviderError(
    'SCRAPER_PARSE_ERROR',
    'Failed to parse popular novel feed: no items matched supported selectors (.page-item-detail, .popular-item-wrap)',
    500
  );
}

/**
 * Universal router parsing function for backward-compatibility.
 */
export function parseNovelFeed(
  html: string,
  feedType: FeedType = 'latest',
  baseUrl = 'https://meionovels.com'
): NovelSummary[] {
  return feedType === 'popular'
    ? parsePopularFeed(html, baseUrl)
    : parseLatestFeed(html, baseUrl);
}
