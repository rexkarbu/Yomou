import { Hono } from 'hono';
import type { Context } from 'hono';
import type { LRUCache } from 'lru-cache';
import type { INovelProvider } from '../interfaces/provider.interface.js';
import { cacheMiddleware } from '../middlewares/cacheMiddleware.js';
import { ProviderError } from '../errors/provider.error.js';
import { validateNovelSlug, validateChapterSlug } from '../utils/parser.js';
import type {
  ApiSuccessResponse,
  NovelSummary,
  NovelDetail,
  ChapterDetail,
} from '../types/index.js';

/**
 * Validates and parses the 'page' query parameter.
 * Strictly requires positive safe integer in decimal format.
 * Rejects empty strings, decimals, exponents, hex, overflow, and repeated query parameters.
 */
export function parsePageParam(c: Context): number {
  const pageQueries = c.req.queries('page');
  if (pageQueries && pageQueries.length > 1) {
    throw new ProviderError('BAD_REQUEST', 'Parameter "page" berulang tidak diizinkan', 400);
  }
  const raw = c.req.query('page');
  if (raw === undefined) {
    return 1;
  }
  if (!/^[0-9]+$/.test(raw)) {
    throw new ProviderError('BAD_REQUEST', 'Parameter "page" harus berupa bilangan bulat positif', 400);
  }
  const pageNum = Number(raw);
  if (!Number.isSafeInteger(pageNum) || pageNum < 1) {
    throw new ProviderError('BAD_REQUEST', 'Parameter "page" harus berupa bilangan bulat positif', 400);
  }
  return pageNum;
}

/**
 * Validates and parses the 'q' (search query) parameter.
 * Requires a non-empty string after trimming.
 * Rejects repeated query parameters.
 */
export function parseQueryParam(c: Context): string {
  const qQueries = c.req.queries('q');
  if (qQueries && qQueries.length > 1) {
    throw new ProviderError('BAD_REQUEST', 'Parameter "q" berulang tidak diizinkan', 400);
  }
  const raw = c.req.query('q');
  if (raw === undefined || typeof raw !== 'string') {
    throw new ProviderError('BAD_REQUEST', 'Parameter "q" wajib diisi', 400);
  }
  const trimmed = raw.trim();
  if (trimmed === '') {
    throw new ProviderError('BAD_REQUEST', 'Parameter "q" tidak boleh kosong', 400);
  }
  return trimmed;
}

/**
 * Factory for creating the novel REST API router.
 * Endpoints are ordered specifically: static (/popular, /latest, /search) before param (/:novelId).
 */
export function createNovelRouter(
  provider: INovelProvider,
  cache?: LRUCache<string, string>
): Hono {
  const router = new Hono();

  // 1. GET /api/novels/popular
  router.get(
    '/popular',
    cacheMiddleware(provider, () => ({ operation: 'popular' }), cache),
    async (c) => {
      const data: NovelSummary[] = await provider.getTrending();
      const res: ApiSuccessResponse<NovelSummary[]> = {
        success: true,
        data,
        error: null,
        meta: {
          source: provider.name,
        },
      };
      return c.json(res, 200);
    }
  );

  // 2. GET /api/novels/latest?page=1
  router.get(
    '/latest',
    cacheMiddleware(
      provider,
      (c) => {
        const page = parsePageParam(c);
        return { operation: 'latest', page };
      },
      cache
    ),
    async (c) => {
      const page = parsePageParam(c);
      const data: NovelSummary[] = await provider.getLatest(page);
      const res: ApiSuccessResponse<NovelSummary[]> = {
        success: true,
        data,
        error: null,
        meta: {
          source: provider.name,
          page,
        },
      };
      return c.json(res, 200);
    }
  );

  // 3. GET /api/novels/search?q=...&page=1
  router.get(
    '/search',
    cacheMiddleware(
      provider,
      (c) => {
        const query = parseQueryParam(c);
        const page = parsePageParam(c);
        return { operation: 'search', query, page };
      },
      cache
    ),
    async (c) => {
      const query = parseQueryParam(c);
      const page = parsePageParam(c);
      const data: NovelSummary[] = await provider.search(query, page);
      const res: ApiSuccessResponse<NovelSummary[]> = {
        success: true,
        data,
        error: null,
        meta: {
          source: provider.name,
          page,
        },
      };
      return c.json(res, 200);
    }
  );

  // 4. GET /api/novels/:novelId
  router.get(
    '/:novelId',
    cacheMiddleware(
      provider,
      (c) => {
        const novelId = validateNovelSlug(c.req.param('novelId') ?? '');
        return { operation: 'detail', novelId };
      },
      cache
    ),
    async (c) => {
      const novelId = validateNovelSlug(c.req.param('novelId') ?? '');
      const data: NovelDetail = await provider.getNovelDetails(novelId);
      const res: ApiSuccessResponse<NovelDetail> = {
        success: true,
        data,
        error: null,
        meta: {
          source: provider.name,
        },
      };
      return c.json(res, 200);
    }
  );

  // 5. GET /api/novels/:novelId/chapters/:chapterId{.+$}
  // Wildcard pattern :chapterId{.+$} captures subpaths like 'mtl/chapter-1'.
  // Single decoding is guaranteed by Hono's c.req.param() without additional decodeURIComponent calls.
  router.get(
    '/:novelId/chapters/:chapterId{.+$}',
    cacheMiddleware(
      provider,
      (c) => {
        const novelId = validateNovelSlug(c.req.param('novelId') ?? '');
        const chapterId = validateChapterSlug(c.req.param('chapterId') ?? '');
        return { operation: 'chapter', novelId, chapterId };
      },
      cache
    ),
    async (c) => {
      const novelId = validateNovelSlug(c.req.param('novelId') ?? '');
      const chapterId = validateChapterSlug(c.req.param('chapterId') ?? '');
      const data: ChapterDetail = await provider.getChapterContent(novelId, chapterId);
      const res: ApiSuccessResponse<ChapterDetail> = {
        success: true,
        data,
        error: null,
        meta: {
          source: provider.name,
        },
      };
      return c.json(res, 200);
    }
  );

  return router;
}
