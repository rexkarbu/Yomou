import { Buffer } from 'node:buffer';
import { LRUCache } from 'lru-cache';
import { ProviderError } from '../errors/provider.error.js';
import { validateChapterSlug, validateNovelSlug } from '../utils/parser.js';

export const CACHE_MAX_ITEMS = 500;
// Payload/key budget, not a bound on Node's heap or process RSS.
export const CACHE_MAX_BYTES = 100_000_000;
export const CACHE_TTL = {
  popular: 21_600_000,
  latest: 900_000,
  search: 1_800_000,
  detail: 43_200_000,
  chapter: 604_800_000,
} as const;

export type CacheRequest =
  | { operation: 'popular' }
  | { operation: 'latest'; page?: number }
  | { operation: 'search'; query: string; page?: number }
  | { operation: 'detail'; novelId: string }
  | { operation: 'chapter'; novelId: string; chapterId: string };

export function buildCacheKey(
  provider: { name: string; baseUrl: string },
  request: CacheRequest,
): string {
  let query: string | null = null;
  let page: number | null = null;
  let novelId: string | null = null;
  let chapterId: string | null = null;

  if (request.operation === 'latest' || request.operation === 'search') {
    page = request.page ?? 1;
    if (!Number.isSafeInteger(page) || page < 1) {
      throw new ProviderError('BAD_REQUEST', 'Page must be a positive integer', 400);
    }
  }
  if (request.operation === 'search') {
    if (typeof request.query !== 'string') {
      throw new ProviderError('BAD_REQUEST', 'Search query must be a string', 400);
    }
    query = request.query.trim();
  }
  if (request.operation === 'detail' || request.operation === 'chapter') {
    novelId = validateNovelSlug(request.novelId);
  }
  if (request.operation === 'chapter') {
    chapterId = validateChapterSlug(request.chapterId);
  }
  return JSON.stringify([
    provider.name, provider.baseUrl, request.operation, query, page, novelId, chapterId,
  ]);
}

export function cacheEntryBytes(key: string, body: string): number {
  return Buffer.byteLength(key, 'utf8') + Buffer.byteLength(body, 'utf8');
}

export function createResponseCache(
  limits: { max?: number; maxSize?: number } = {},
): LRUCache<string, string> {
  return new LRUCache<string, string>({
    max: limits.max ?? CACHE_MAX_ITEMS,
    maxSize: limits.maxSize ?? CACHE_MAX_BYTES,
    sizeCalculation: (body, key) => cacheEntryBytes(key, body),
    allowStale: false,
    updateAgeOnGet: false,
    updateAgeOnHas: false,
    ttlResolution: 0,
  });
}

export const responseCache = createResponseCache();

export function storeCacheEntry(
  cache: LRUCache<string, string>,
  key: string,
  body: string,
  ttl: number,
): boolean {
  if (cacheEntryBytes(key, body) > cache.maxSize) return false;
  cache.set(key, body, { ttl });
  return true;
}
