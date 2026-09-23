/**
 * Chapter Content Sanitizer & ContentBlock[] Extractor
 * Strictly compliant with PRD Sections 3.1, 7, 8.3 & scraper-resilience guidelines
 */

import * as cheerio from 'cheerio';
import type {
  ContentBlock,
  ParagraphBlock,
  HeadingBlock,
  HeadingLevel,
  ImageBlock,
  SeparatorBlock,
  InlineSpan,
} from '../types/blocks.js';
import type { ChapterDetail, ChapterImage } from '../types/novel.js';
import { ProviderError } from '../errors/provider.error.js';
import {
  extractChapterSlug,
  extractChapterNumber,
  detectBotChallenge,
  normalizeImageUrl,
  validateChapterSlug,
  hasPathTraversal,
} from './parser.js';

export interface ExtractChapterContentOptions {
  novelId: string;
  chapterId: string;
  baseUrl: string;
  chapterPageUrl: string;
}

interface FormattingContext {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
}

const PROMO_HOSTNAMES = ['saweria.co', 'trakteer.id', 'karyakarsa.com', 'patreon.com'];

const BLOCK_TAGS = new Set([
  'p',
  'div',
  'blockquote',
  'section',
  'article',
  'figure',
  'figcaption',
  'ul',
  'ol',
  'li',
  'header',
  'footer',
  'main',
  'aside',
]);

/**
 * Checks if a given URL href matches known donation/promo hostnames.
 * Performs strict hostname matching instead of arbitrary substring matching on the entire URL.
 */
function isPromoUrl(href: string, baseUrl: string): boolean {
  if (!href || typeof href !== 'string') return false;
  try {
    const parsed = new URL(href, baseUrl);
    const hostname = parsed.hostname.toLowerCase();
    return PROMO_HOSTNAMES.some((domain) => hostname === domain || hostname.endsWith('.' + domain));
  } catch {
    return false;
  }
}

/**
 * Normalizes an array of InlineSpan:
 * 1. Merges adjacent spans that have identical formatting flags.
 * 2. Trims leading whitespace of the first span and trailing whitespace of the last span.
 * 3. Preserves whitespace in the middle between words/spans.
 */
export function normalizeSpans(spans: InlineSpan[]): InlineSpan[] {
  if (!spans || spans.length === 0) return [];

  const merged: InlineSpan[] = [];
  for (const span of spans) {
    if (!span.text) continue;
    if (merged.length > 0) {
      const prev = merged[merged.length - 1];
      const sameFormat =
        Boolean(prev.bold) === Boolean(span.bold) &&
        Boolean(prev.italic) === Boolean(span.italic) &&
        Boolean(prev.underline) === Boolean(span.underline) &&
        Boolean(prev.strikethrough) === Boolean(span.strikethrough);

      if (sameFormat) {
        prev.text += span.text;
        continue;
      }
    }
    merged.push({ ...span });
  }

  if (merged.length > 0) {
    // Trim leading whitespace from first span
    merged[0].text = merged[0].text.replace(/^\s+/, '');
    // Trim trailing whitespace from last span
    const lastIdx = merged.length - 1;
    merged[lastIdx].text = merged[lastIdx].text.replace(/\s+$/, '');
  }

  return merged.filter((s) => s.text.length > 0);
}

/**
 * Checks if a collection of spans has non-empty printable text.
 */
function spansTotalText(spans: InlineSpan[]): string {
  return spans.map((s) => s.text).join('').trim();
}

/**
 * Checks if text is a common visual separator sequence (e.g. '***', '---', '◆◆◆').
 */
function isVisualSeparatorText(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 2 || trimmed.length > 30) return false;
  return (
    /^[*_-]{3,}$/.test(trimmed) ||
    /^[~=]{3,}$/.test(trimmed) ||
    (/^[◆◇■□●○* \t-]+$/.test(trimmed) && trimmed.replace(/[\s-]/g, '').length >= 3)
  );
}

/**
 * Extracts a valid HTTP(S) image URL from candidate attributes in order of precedence:
 * ['data-orig-file', 'data-src', 'data-lazy-src', 'src'].
 * Resolves relative URLs against chapterPageUrl.
 */
function extractValidImageUrl(
  imgEl: cheerio.Cheerio<any>,
  chapterPageUrl: string
): string | null {
  const candidateAttrs = ['data-orig-file', 'data-src', 'data-lazy-src', 'src'];

  for (const attr of candidateAttrs) {
    const rawVal = imgEl.attr(attr);
    if (!rawVal || typeof rawVal !== 'string') continue;

    const trimmed = rawVal.trim();
    if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('javascript:')) {
      continue;
    }

    const normalized = normalizeImageUrl(trimmed, chapterPageUrl);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

/**
 * Cleans non-story DOM elements, unwraps story links, and removes known promo/ad widgets.
 * Accurately targets promo hostnames and preserves mixed story content without arbitrary length heuristics.
 */
export function cleanChapterDom(
  $: cheerio.CheerioAPI,
  container: cheerio.Cheerio<any>,
  baseUrl: string
): void {
  // 1. Unconditional removal of executable scripts, stylesheets, and forms
  container.find('script, style, iframe, form, button, input, select, noscript, svg').remove();

  // 2. Remove proven ad containers and social widgets
  container
    .find(
      '.adsbygoogle, .code-block, .wp-manga-ads, .ai-viewport-, .sharedaddy, #disqus_thread, .comments-area, .wp-manga-comments, .social-share, .post-share'
    )
    .remove();

  // 3. Remove hidden elements
  container.find('[hidden], [style*="display:none"], [style*="display: none"]').remove();

  // 4. Remove donation / promo elements with exact hostname matching
  container.find('a').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (isPromoUrl(href, baseUrl)) {
      // If inside an explicitly dedicated promo/donation wrapper, remove the dedicated wrapper
      const parent = $(el).closest('.donation-box, .promo-box');
      if (parent.length > 0) {
        parent.remove();
      } else {
        // In mixed content parents, only remove the link element so story text/images remain intact
        $(el).remove();
      }
    } else {
      // 5. Unwrap safe story links so story text inside is never dropped (Correction 2)
      $(el).replaceWith($(el).contents());
    }
  });
}

/**
 * Parses and strictly validates a chapter navigation link.
 * Distinguishes legitimate absent/disabled navigation from malformed, cross-origin, or foreign novel URLs.
 * Throws SCRAPER_PARSE_ERROR (500) on invalid navigation URLs instead of silently swallowing to null.
 */
function parseNavigationLink(
  linkA: cheerio.Cheerio<any>,
  direction: 'prev' | 'next',
  novelId: string,
  chapterId: string,
  baseOrigin: string,
  chapterPageUrl: string
): string | null {
  if (linkA.length === 0) {
    return null; // Legitimate absence
  }

  // Check disabled markers (e.g. <a class="btn prev_page disabled"> or aria-disabled)
  if (linkA.hasClass('disabled') || linkA.attr('aria-disabled') === 'true') {
    return null; // Legitimate disabled marker
  }

  const rawHref = linkA.attr('href')?.trim();
  if (!rawHref || rawHref === '#' || rawHref.startsWith('javascript:')) {
    return null; // Legitimate absent/placeholder href
  }

  // 1. Strict traversal guard on raw input
  if (hasPathTraversal(rawHref)) {
    throw new ProviderError(
      'SCRAPER_PARSE_ERROR',
      `Path traversal detected in ${direction} chapter URL: "${rawHref}"`,
      500,
      { novelId, chapterId, rawHref, direction }
    );
  }

  // 2. Resolve relative URL against chapterPageUrl
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawHref, chapterPageUrl);
  } catch {
    throw new ProviderError(
      'SCRAPER_PARSE_ERROR',
      `Malformed ${direction} chapter URL: "${rawHref}"`,
      500,
      { novelId, chapterId, rawHref, direction }
    );
  }

  // 3. Traversal guard on resolved pathname
  if (hasPathTraversal(parsedUrl.pathname)) {
    throw new ProviderError(
      'SCRAPER_PARSE_ERROR',
      `Path traversal detected in resolved ${direction} chapter pathname: "${parsedUrl.pathname}"`,
      500,
      { novelId, chapterId, rawHref, direction }
    );
  }

  // 4. Origin guard
  if (parsedUrl.origin.toLowerCase() !== baseOrigin) {
    throw new ProviderError(
      'SCRAPER_PARSE_ERROR',
      `Cross-origin ${direction} chapter URL rejected: "${rawHref}" does not match "${baseOrigin}"`,
      500,
      { novelId, chapterId, rawHref, direction }
    );
  }

  // 5. Novel namespace guard
  const expectedPrefix = `/novel/${novelId.toLowerCase()}/`;
  if (!parsedUrl.pathname.toLowerCase().startsWith(expectedPrefix)) {
    throw new ProviderError(
      'SCRAPER_PARSE_ERROR',
      `${direction.toUpperCase()} chapter URL "${rawHref}" does not belong to novel "${novelId}"`,
      500,
      { novelId, chapterId, rawHref, direction }
    );
  }

  // 6. Chapter ID extraction & canonical validation
  const slug = extractChapterSlug(parsedUrl.pathname, novelId);
  if (!slug) {
    throw new ProviderError(
      'SCRAPER_PARSE_ERROR',
      `Failed to extract chapter ID from ${direction} chapter URL: "${rawHref}"`,
      500,
      { novelId, chapterId, rawHref, direction }
    );
  }

  try {
    validateChapterSlug(slug);
  } catch (err: any) {
    throw new ProviderError(
      'SCRAPER_PARSE_ERROR',
      `Extracted ${direction} chapter ID "${slug}" from "${rawHref}" is not canonical: ${err.message}`,
      500,
      { novelId, chapterId, rawHref, direction }
    );
  }

  if (slug === chapterId) {
    return null; // Self link
  }

  return slug;
}

/**
 * Extracts and sanitizes chapter content from upstream HTML.
 * Produces structured ChapterDetail with ContentBlock[] and ChapterImage[].
 */
export function extractChapterContent(
  html: string,
  options: ExtractChapterContentOptions
): ChapterDetail {
  const { novelId, chapterId, baseUrl, chapterPageUrl } = options;

  // 1. Check for anti-bot challenge
  if (detectBotChallenge(html)) {
    throw new ProviderError(
      'PROVIDER_BLOCKED',
      `Bot protection challenge detected when fetching chapter "${chapterId}" of novel "${novelId}"`,
      503,
      { novelId, chapterId }
    );
  }

  const $ = cheerio.load(html);

  // 2. Check for explicit 404 or soft-404 (novel detail page returned on non-existent chapter)
  const isExplicit404 =
    $('body').hasClass('error404') ||
    $('body').hasClass('not-found') ||
    $('title').text().toLowerCase().includes('page not found') ||
    $('.error-404').length > 0;

  if (isExplicit404) {
    throw new ProviderError(
      'PROVIDER_NOT_FOUND',
      `Chapter "${chapterId}" not found for novel "${novelId}" (404 Page Not Found)`,
      404,
      { novelId, chapterId }
    );
  }

  const isNovelDetailPage =
    ($('.summary_content').length > 0 ||
      $('.tab-summary').length > 0 ||
      $('.profile-manga').length > 0 ||
      $('.wp-manga-chapter').length > 0) &&
    $('.reading-content').length === 0 &&
    $('#chapter-heading').length === 0;

  if (isNovelDetailPage) {
    throw new ProviderError(
      'PROVIDER_NOT_FOUND',
      `Chapter "${chapterId}" not found for novel "${novelId}" (redirected to novel detail page)`,
      404,
      { novelId, chapterId }
    );
  }

  // 3. Select reading content container with cascading selectors (Correction 3)
  const hasReaderEvidence =
    $('#chapter-heading').length > 0 ||
    $('a.prev_page, a.next_page, .nav-previous a, .nav-next a').length > 0 ||
    $('select.single-chapter-select').length > 0 ||
    $('body').hasClass('wp-manga-page') ||
    $('body').hasClass('reading-manga');

  let container: cheerio.Cheerio<any> | null = null;

  if ($('.reading-content .text-left').length > 0) {
    container = $('.reading-content .text-left').first();
  } else if ($('.reading-content').length > 0) {
    container = $('.reading-content').first();
  } else if (hasReaderEvidence) {
    // Only fall back to .entry-content when reader markers prove this is a reader page
    if ($('.entry-content .text-left').length > 0) {
      container = $('.entry-content .text-left').first();
    } else if ($('.entry-content').length > 0) {
      container = $('.entry-content').first();
    } else if ($('div[itemprop="articleBody"]').length > 0) {
      container = $('div[itemprop="articleBody"]').first();
    }
  }

  if (!container || container.length === 0) {
    throw new ProviderError(
      'SCRAPER_PARSE_ERROR',
      `Chapter reading content container not found for "${chapterId}" in novel "${novelId}"`,
      500,
      { novelId, chapterId }
    );
  }

  // 4. Extract chapter title
  let rawTitle =
    $('.breadcrumb li.active, .breadcrumb .active, .breadcrumbs .current-item').first().text().trim() ||
    $('#chapter-heading').first().text().trim() ||
    $('title').text().trim() ||
    chapterId;

  // Clean trailing site name if extracted from <title>
  rawTitle = rawTitle.replace(/\s*-\s*Baca\s+Light\s+Novel.*$/i, '').trim();
  const title = rawTitle || chapterId;

  // 5. Extract chapter number
  let chapterNumber = extractChapterNumber(title) ?? extractChapterNumber(chapterId);
  if (chapterNumber === undefined) {
    chapterNumber = title.toLowerCase().includes('prolog') ? 0 : 1;
  }

  // 6. Extract navigation links with strict validation (Correction 3)
  const baseOrigin = new URL(baseUrl).origin.toLowerCase();

  const prevA = $('a.prev_page, .nav-previous a, a[rel="prev"]').filter((_, el) => Boolean($(el).attr('href'))).first();
  const nextA = $('a.next_page, .nav-next a, a[rel="next"]').filter((_, el) => Boolean($(el).attr('href'))).first();

  const prevChapterId = parseNavigationLink(prevA, 'prev', novelId, chapterId, baseOrigin, chapterPageUrl);
  const nextChapterId = parseNavigationLink(nextA, 'next', novelId, chapterId, baseOrigin, chapterPageUrl);

  // 7. Clean container DOM noise
  cleanChapterDom($, container, baseUrl);

  // 8. Traverse container in source DOM order to extract ContentBlock[] and ChapterImage[]
  const blocks: ContentBlock[] = [];
  const images: ChapterImage[] = [];

  let pSeq = 1;
  let hSeq = 1;
  let sSeq = 1;
  let imgSeq = 1;

  let currentInlineSpans: InlineSpan[] = [];

  function flushParagraph() {
    const norm = normalizeSpans(currentInlineSpans);
    currentInlineSpans = [];

    if (norm.length > 0 && spansTotalText(norm).length > 0) {
      // Check if the whole paragraph text is a visual separator
      const combinedText = norm.map((s) => s.text).join('').trim();
      if (isVisualSeparatorText(combinedText)) {
        blocks.push({
          type: 'separator',
          id: `s_${String(sSeq++).padStart(3, '0')}`,
        });
        return;
      }

      blocks.push({
        type: 'paragraph',
        id: `b_${String(pSeq++).padStart(3, '0')}`,
        spans: norm,
      });
    }
  }

  function processImageElement(imgEl: cheerio.Cheerio<any>) {
    flushParagraph();

    const validUrl = extractValidImageUrl(imgEl, chapterPageUrl);
    if (!validUrl) return; // Skip invalid or placeholder images

    const imageId = `img_${String(imgSeq++).padStart(2, '0')}`;
    const alt = imgEl.attr('alt')?.trim() || undefined;
    const caption = imgEl.attr('title')?.trim() || undefined;

    // Consistency guarantee: 1:1 mapping between ImageBlock.id and ChapterImage.imageId
    const imageBlock: ImageBlock = {
      type: 'image',
      id: imageId,
      alt,
      caption,
    };

    const chapterImage: ChapterImage = {
      imageId,
      remoteUrl: validUrl,
      alt,
      caption,
    };

    blocks.push(imageBlock);
    images.push(chapterImage);
  }

  function walk(node: any, ctx: FormattingContext) {
    if (node.type === 'text') {
      const text = (node as any).data;
      if (text) {
        currentInlineSpans.push({
          text,
          ...(ctx.bold ? { bold: true } : {}),
          ...(ctx.italic ? { italic: true } : {}),
          ...(ctx.underline ? { underline: true } : {}),
          ...(ctx.strikethrough ? { strikethrough: true } : {}),
        });
      }
      return;
    }

    if (node.type === 'tag') {
      const el = $(node);
      const tag = (node as any).tagName?.toLowerCase();

      // Heading 1-6
      const hMatch = tag.match(/^h([1-6])$/);
      if (hMatch) {
        flushParagraph();
        const level = parseInt(hMatch[1], 10) as HeadingLevel;
        const text = el.text().trim();
        if (text) {
          blocks.push({
            type: 'heading',
            id: `h_${String(hSeq++).padStart(3, '0')}`,
            level,
            text,
          });
        }
        return;
      }

      // Separator (<hr>)
      if (tag === 'hr') {
        flushParagraph();
        blocks.push({
          type: 'separator',
          id: `s_${String(sSeq++).padStart(3, '0')}`,
        });
        return;
      }

      // Image (whether top-level or inside any wrapper like <figure>, <span>, <p>, <strong>)
      if (tag === 'img') {
        processImageElement(el);
        return;
      }

      // Line break
      if (tag === 'br') {
        currentInlineSpans.push({
          text: '\n',
          ...(ctx.bold ? { bold: true } : {}),
          ...(ctx.italic ? { italic: true } : {}),
          ...(ctx.underline ? { underline: true } : {}),
          ...(ctx.strikethrough ? { strikethrough: true } : {}),
        });
        return;
      }

      // Block-level containers: p, div, blockquote, section, article, figure, etc.
      // Entering or leaving a block element flushes paragraph boundaries
      if (BLOCK_TAGS.has(tag)) {
        flushParagraph();
        const children = (node as any).children || [];
        for (const child of children) {
          walk(child, ctx);
        }
        flushParagraph();
        return;
      }

      // Inline elements (b, strong, i, em, u, s, del, strike, span, etc.)
      const nextCtx: FormattingContext = { ...ctx };
      if (tag === 'b' || tag === 'strong') nextCtx.bold = true;
      if (tag === 'i' || tag === 'em') nextCtx.italic = true;
      if (tag === 'u') nextCtx.underline = true;
      if (tag === 's' || tag === 'del' || tag === 'strike') nextCtx.strikethrough = true;

      const children = (node as any).children || [];
      for (const child of children) {
        walk(child, nextCtx);
      }
    }
  }

  // Iterate over container direct child nodes
  const children = container.contents().toArray();
  for (const child of children) {
    walk(child, {});
  }
  flushParagraph();

  // 9. Validation of extracted blocks (Correction 1: PRD Section 3.1 & 7)
  // CHAPTER_EMPTY_CONTENT applies strictly when sanitization results in 0 blocks.
  // Short text chapters and image-only chapters are valid as long as blocks.length > 0.
  if (blocks.length === 0) {
    throw new ProviderError(
      'CHAPTER_EMPTY_CONTENT',
      'Konten bab tidak ditemukan atau kosong dari sumber web.',
      422,
      { novelId, chapterId }
    );
  }

  return {
    id: chapterId,
    novelId,
    title,
    chapterNumber,
    blocks,
    images,
    prevChapterId,
    nextChapterId,
  };
}
