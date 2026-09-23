/**
 * Meionovels HTML Parser Utility
 * Strictly compliant with PRD.md Section 3.5 & 10 and scraper-resilience guidelines
 */

import * as cheerio from 'cheerio';
import type { NovelSummary, NovelStatus, ChapterSummary, NovelDetail } from '../types/novel.js';
import { ProviderError } from '../errors/provider.error.js';

export type FeedType = 'latest' | 'popular';

/**
 * Validates a novel slug string.
 * Strictly rejects path traversal (../), path separators, control characters, schemes, and empty/whitespace input.
 * @throws {ProviderError} BAD_REQUEST (400) if novelId is invalid.
 */
export function validateNovelSlug(novelId: string): string {
  if (!novelId || typeof novelId !== 'string') {
    throw new ProviderError('BAD_REQUEST', 'Novel ID must be a non-empty string', 400);
  }
  const trimmed = novelId.trim();
  if (!trimmed) {
    throw new ProviderError('BAD_REQUEST', 'Novel ID cannot be whitespace only', 400);
  }
  if (
    trimmed.includes('/') ||
    trimmed.includes('\\') ||
    trimmed.includes('..') ||
    trimmed.includes(':') ||
    trimmed.includes('\0') ||
    !/^[a-z0-9_-]+$/i.test(trimmed)
  ) {
    throw new ProviderError(
      'BAD_REQUEST',
      `Invalid novelId format: "${novelId}". Must be an alphanumeric slug without slashes or path traversal.`,
      400
    );
  }
  return trimmed;
}

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
 * Detects literal or percent-encoded directory traversal attempts.
 * Checks for .., %2e%2e, %2e., .%2e, and backslashes before any URL normalization occurs.
 */
export function hasPathTraversal(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  if (input.includes('..') || input.includes('\\')) return true;

  if (/(?:^|[/\\])(?:\.\.|%2e%2e|\.%2e|%2e\.)(?:[/\\]|$|[?#])/i.test(input)) {
    return true;
  }

  try {
    const decoded = decodeURIComponent(input);
    if (decoded.includes('..') || decoded.includes('\\')) {
      return true;
    }
  } catch {
    // Malformed URI encoding is rejected as unsafe
    return true;
  }

  return false;
}

/**
 * Extracts a chapter slug / subpath from a chapter URL or path.
 * If novelSlug is provided, extracts the relative subpath under `/novel/{novelSlug}/`.
 * Preserves intermediate segments such as 'mtl/' (e.g. 'mtl/chapter-1648-tamat')
 * to ensure IDs remain unique and directly mappable to the source URL.
 *
 * Rejects path traversal (literal or encoded) and URLs not belonging to the expected novel.
 * Does NOT use basename fallback to rescue invalid URLs.
 */
export function extractChapterSlug(urlOrPath: string, novelSlug?: string): string {
  if (!urlOrPath || typeof urlOrPath !== 'string') return '';
  if (hasPathTraversal(urlOrPath)) return '';

  const clean = urlOrPath.replace(/[?#].*$/, '').replace(/\/+$/, '');

  if (novelSlug) {
    const prefix = `/novel/${novelSlug.toLowerCase()}/`;
    const lowerClean = clean.toLowerCase();
    const idx = lowerClean.indexOf(prefix);
    if (idx !== -1) {
      const subpath = clean.slice(idx + prefix.length).replace(/^\/+/, '');
      if (subpath && !hasPathTraversal(subpath)) {
        return subpath;
      }
    }
    return '';
  }

  // Fallback when novelSlug is not provided: match /novel/<slug>/(<chapter-subpath>)
  const match = clean.match(/\/novel\/[^/]+\/(.+)$/i);
  if (match && match[1]) {
    const subpath = match[1].replace(/^\/+/, '');
    if (subpath && !hasPathTraversal(subpath)) {
      return subpath;
    }
  }

  return '';
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
    const chId = extractChapterSlug(rawChUrl, id);
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
    const chId = extractChapterSlug(rawChUrl, id);
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

/**
 * Parses search results HTML into an array of NovelSummary objects.
 * Supports WordPress manga search results layout (.row.c-tabs-item__content).
 *
 * @throws {ProviderError} PROVIDER_BLOCKED (503) if Cloudflare challenge detected
 * @throws {ProviderError} SCRAPER_PARSE_ERROR (500) if markup is corrupted or unexpected
 */
export function parseSearchFeed(html: string, baseUrl = 'https://meionovels.com'): NovelSummary[] {
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

  // Scope search area to main content, excluding sidebar, header, and footer
  const mainCol = $('.search-wrap, .c-blog__content, .page-content-listing, #loop-content, .main-col, .tab-content-wrap');
  const scope = mainCol.length > 0
    ? mainCol
    : $('body').children().not('aside, .sidebar, #sidebar, .widget-area, footer, header');
  const searchRoot = scope.length > 0 ? scope : $('body');

  // Check known empty search results marker in searchRoot only, ignoring sidebar/footer
  const notFoundEl = searchRoot.find('.not-found, .no-results, .not-found-content').not('aside *, .sidebar *, #sidebar *, .widget-area *, footer *');
  const notFoundText = searchRoot.clone().find('aside, .sidebar, #sidebar, .widget-area, footer, header').remove().end().text();
  const isSearchEmpty =
    notFoundEl.length > 0 ||
    notFoundText.includes('No matches found') ||
    notFoundText.includes('Nothing Found') ||
    notFoundText.includes('tidak ditemukan');

  const searchItems = searchRoot
    .find('.c-tabs-item__content')
    .not('aside *, .sidebar *, #sidebar *, .widget-area *, footer *');

  if (searchItems.length > 0) {
    const items: NovelSummary[] = [];

    searchItems.each((_, el) => {
      const thumbA = $(el).find('.tab-thumb a').first();
      const titleA = $(el).find('.post-title a').first();

      const rawNovelUrl = titleA.attr('href') || thumbA.attr('href') || '';
      const id = extractNovelSlug(rawNovelUrl);
      if (!id) return;

      const title = titleA.text().trim() || thumbA.attr('title')?.trim() || id;

      const img = $(el).find('.tab-thumb img').first();
      const rawCover =
        img.attr('data-src') ||
        img.attr('data-lazy-src') ||
        img.attr('src') ||
        '';
      const coverUrl = normalizeImageUrl(rawCover, baseUrl);
      if (!coverUrl) return; // Reject items with invalid, relative, or dangerous covers

      const authors = $(el)
        .find('.mg_author .summary-content a, .mg_author .summary-content')
        .map((_, a) => $(a).text().trim())
        .get()
        .filter(Boolean)
        .filter((v, i, a) => a.indexOf(v) === i);
      const author = authors.join(', ') || undefined;

      const genres = $(el)
        .find('.mg_genres .summary-content a')
        .map((_, a) => $(a).text().trim())
        .get()
        .filter(Boolean);

      const statusText = $(el).find('.mg_status .summary-content').text().trim().toLowerCase();
      const status: NovelStatus | undefined = statusText.includes('complete')
        ? 'Completed'
        : statusText.includes('ongoing')
        ? 'Ongoing'
        : undefined;

      const latestChapA = $(el).find('.latest-chap .chapter a').first();
      const rawChUrl = latestChapA.attr('href') || '';
      const chTitle = latestChapA.text().trim();
      const chId = extractChapterSlug(rawChUrl, id);
      const postOn = $(el).find('.post-on').first().text().trim() || undefined;

      let latestChapter: NovelSummary['latestChapter'] = undefined;
      if (chTitle || chId) {
        latestChapter = {
          id: chId,
          title: chTitle || chId,
          chapterNumber: extractChapterNumber(chTitle),
          releaseDate: postOn,
        };
      }

      items.push({
        id,
        title,
        author,
        coverUrl,
        genres: genres.length > 0 ? genres : undefined,
        status,
        latestChapter,
      });
    });

    if (items.length === 0) {
      throw new ProviderError(
        'SCRAPER_PARSE_ERROR',
        `Search container found (${searchItems.length} elements), but failed to extract any valid novel items`,
        500
      );
    }

    return items;
  }

  if (isSearchEmpty) {
    return [];
  }

  throw new ProviderError(
    'SCRAPER_PARSE_ERROR',
    'Failed to parse search results: no search items matched selector .c-tabs-item__content and no empty-search marker found',
    500
  );
}

/**
 * Parses novel detail page HTML into NovelSummary metadata (excluding chapters).
 *
 * @throws {ProviderError} PROVIDER_BLOCKED (503) if Cloudflare challenge detected
 * @throws {ProviderError} PROVIDER_NOT_FOUND (404) if upstream returned a 404 / not found page
 * @throws {ProviderError} SCRAPER_PARSE_ERROR (500) if markup is corrupted or unexpected
 */
export function parseNovelMetadata(
  html: string,
  novelId: string,
  baseUrl = 'https://meionovels.com'
): Omit<NovelDetail, 'chapters'> {
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

  // Scope 404 / Not found markers strictly to main novel content, ignoring sidebar/footer widgets
  const mainContent = $('.post-content, .tab-summary, .profile-manga, .c-page-content, .main-col');
  const scope = mainContent.length > 0
    ? mainContent
    : $('body').children().not('aside, .sidebar, #sidebar, .widget-area, footer, header');
  const contentRoot = scope.length > 0 ? scope : $('body');

  const notFoundEl = contentRoot
    .find('.not-found, .no-results')
    .not('aside *, .sidebar *, #sidebar *, .widget-area *, footer *');
  const contentTitle = contentRoot
    .find('h1.page-title, h1.entry-title')
    .not('aside *, .sidebar *, #sidebar *, footer *')
    .text();

  const isNotFound =
    $('body').hasClass('error404') ||
    $('title').text().includes('Page not found') ||
    notFoundEl.length > 0 ||
    contentTitle.includes('Nothing Found');

  if (isNotFound) {
    throw new ProviderError(
      'PROVIDER_NOT_FOUND',
      `Novel "${novelId}" was not found upstream (404)`,
      404
    );
  }

  const titleEl = $('.post-title h1, .post-title h3, h1.entry-title');
  const title = titleEl.text().trim();
  if (!title) {
    throw new ProviderError(
      'SCRAPER_PARSE_ERROR',
      `Failed to parse novel details for "${novelId}": title not found in HTML`,
      500
    );
  }

  const img = $('.summary_image img').first();
  const rawCover =
    img.attr('data-src') ||
    img.attr('data-lazy-src') ||
    img.attr('src') ||
    '';
  const coverUrl = normalizeImageUrl(rawCover, baseUrl);
  if (!coverUrl) {
    throw new ProviderError(
      'SCRAPER_PARSE_ERROR',
      `Failed to parse novel details for "${novelId}": valid cover URL not found or rejected`,
      500
    );
  }

  const authors = $('.author-content a, .author-content')
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i);
  const author = authors.join(', ') || undefined;

  const genres = $('.genres-content a')
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);

  const statusItem = $('.post-content_item').filter((_, el) =>
    $(el).find('h5').text().trim().toLowerCase().includes('status')
  );
  const statusText = statusItem.find('.summary-content').text().trim().toLowerCase();
  const status: NovelStatus | undefined = statusText.includes('complete')
    ? 'Completed'
    : statusText.includes('ongoing')
    ? 'Ongoing'
    : undefined;

  const synopsisContainer = $(
    '.description-summary .summary__content #editdescription, .description-summary .summary__content, .description-summary'
  );
  const pTexts = synopsisContainer
    .find('p')
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);
  const synopsis =
    pTexts.length > 0
      ? pTexts.join('\n\n')
      : synopsisContainer.text().replace(/^Summary\s*/i, '').trim() || undefined;

  return {
    id: novelId,
    title,
    author,
    coverUrl,
    synopsis,
    genres: genres.length > 0 ? genres : undefined,
    status,
  };
}

/**
 * Parses chapter list HTML (from AJAX or static list) into an array of ChapterSummary objects.
 * Enforces:
 * 1. Chronological order (reversing upstream newest-first list).
 * 2. Cross-origin rejection & URL validation (must belong to novelId, no traversal).
 * 3. Preservation of subpaths like 'mtl/' in chapter ID.
 * 4. Strictly avoids using parsed chapter numbers as the basis for sorting.
 *
 * @throws {ProviderError} PROVIDER_BLOCKED (503) if Cloudflare challenge detected
 * @throws {ProviderError} SCRAPER_PARSE_ERROR (500) if markup is corrupted or unexpected
 */
export function parseNovelChapters(
  html: string,
  novelId: string,
  baseUrl = 'https://meionovels.com'
): ChapterSummary[] {
  if (!html || typeof html !== 'string') {
    throw new ProviderError('SCRAPER_PARSE_ERROR', 'Empty or non-string chapter HTML received', 500);
  }

  if (detectBotChallenge(html)) {
    throw new ProviderError(
      'PROVIDER_BLOCKED',
      'Upstream returned Cloudflare or bot challenge verification page',
      503
    );
  }

  const $ = cheerio.load(html);

  const chapterElements = $('.wp-manga-chapter');
  if (chapterElements.length === 0) {
    // Check if there is an explicit verified empty marker inside the chapter container
    const chapterHolder = $('#manga-chapters-holder, .listing-chapters_wrap, ul.main.version-chap');
    const hasExplicitEmptyMarker =
      chapterHolder.find('.no-chapter, .empty-chapters').length > 0 ||
      /no chapter|belum ada chapter|tidak ada bab|no chapter released/i.test(chapterHolder.text());

    if (hasExplicitEmptyMarker && !html.includes('fa-spinner')) {
      return [];
    }

    throw new ProviderError(
      'SCRAPER_PARSE_ERROR',
      `Failed to parse chapters for novel "${novelId}": no .wp-manga-chapter elements found`,
      500
    );
  }

  const baseOrigin = new URL(baseUrl).origin.toLowerCase();
  const expectedNovelPrefix = `/novel/${novelId.toLowerCase()}/`;

  interface RawChapter {
    id: string;
    title: string;
    releaseDate?: string;
    parsedNum?: number;
  }

  const rawList: RawChapter[] = [];

  chapterElements.each((_, el) => {
    const a = $(el).find('a').first();
    const rawHref = a.attr('href') || '';
    const title = a.text().trim();

    if (!rawHref || !title) {
      throw new ProviderError(
        'SCRAPER_PARSE_ERROR',
        `Corrupted chapter element detected in novel "${novelId}": missing title or href`,
        500
      );
    }

    // 1. Reject path traversal (literal or encoded) BEFORE URL normalization strips evidence
    if (hasPathTraversal(rawHref)) {
      throw new ProviderError(
        'SCRAPER_PARSE_ERROR',
        `Path traversal detected in chapter URL: "${rawHref}"`,
        500
      );
    }

    // 2. Validate URL structure and origin
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawHref, baseUrl);
    } catch {
      throw new ProviderError(
        'SCRAPER_PARSE_ERROR',
        `Malformed chapter URL in novel "${novelId}": "${rawHref}"`,
        500
      );
    }

    if (parsedUrl.origin.toLowerCase() !== baseOrigin) {
      throw new ProviderError(
        'SCRAPER_PARSE_ERROR',
        `Cross-origin chapter URL rejected: "${rawHref}" does not match "${baseOrigin}"`,
        500
      );
    }

    if (!parsedUrl.pathname.toLowerCase().startsWith(expectedNovelPrefix)) {
      throw new ProviderError(
        'SCRAPER_PARSE_ERROR',
        `Chapter URL "${rawHref}" does not belong to novel "${novelId}"`,
        500
      );
    }

    // 3. Extract ID with strict validation
    const id = extractChapterSlug(rawHref, novelId);
    if (!id) {
      throw new ProviderError(
        'SCRAPER_PARSE_ERROR',
        `Failed to extract chapter ID from URL: "${rawHref}"`,
        500
      );
    }

    const dateText = $(el).find('.chapter-release-date').text().trim() || undefined;
    const parsedNum = extractChapterNumber(title);

    rawList.push({
      id,
      title,
      releaseDate: dateText,
      parsedNum,
    });
  });

  if (rawList.length === 0) {
    throw new ProviderError(
      'SCRAPER_PARSE_ERROR',
      `Chapter container found (${chapterElements.length} elements), but failed to extract any valid chapters`,
      500
    );
  }

  // Upstream Meionovels (Madara theme) serves chapters strictly in newest-first order.
  // Consistently reverse the source list to establish true chronological progression (oldest first).
  rawList.reverse();

  // Map into ChapterSummary[] without altering array sequence
  return rawList.map((item, idx) => ({
    id: item.id,
    novelId,
    title: item.title,
    chapterNumber: item.parsedNum !== undefined ? item.parsedNum : (item.title.toLowerCase().includes('prolog') ? 0 : idx + 1),
    releaseDate: item.releaseDate,
  }));
}
