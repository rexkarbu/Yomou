import type { Context, MiddlewareHandler } from 'hono';
import type { ApiSuccessResponse } from '../types/api.js';
import {
  buildCacheKey, CACHE_TTL, responseCache, storeCacheEntry,
  type CacheRequest,
} from '../services/cache.service.js';

function isSuccessEnvelope(value: unknown): value is ApiSuccessResponse<unknown> {
  if (typeof value !== 'object' || value === null) return false;
  return 'success' in value && value.success === true
    && 'error' in value && value.error === null
    && 'data' in value
    && (!('meta' in value) || value.meta === undefined
      || (typeof value.meta === 'object' && value.meta !== null && !Array.isArray(value.meta)));
}

/** For public JSON GET routes. Resolve/validate parameters before any cache lookup. */
export function cacheMiddleware(
  provider: { name: string; baseUrl: string },
  resolveRequest: (c: Context) => CacheRequest,
  cache = responseCache,
): MiddlewareHandler {
  return async (c, next) => {
    if (c.req.method !== 'GET') {
      await next();
      return;
    }

    const request = resolveRequest(c);
    const key = buildCacheKey(provider, request);
    const cached = cache.get(key);
    if (cached !== undefined) {
      return c.body(cached, 200, { 'Content-Type': 'application/json; charset=UTF-8' });
    }

    await next();
    const headers = c.res.headers;
    if (c.error || c.res.status !== 200
      || headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json'
      || headers.has('set-cookie') || headers.has('content-encoding')
      || /\b(no-store|private)\b/i.test(headers.get('cache-control') ?? '')) return;

    let envelope: unknown;
    try {
      envelope = await c.res.clone().json();
    } catch {
      return;
    }
    if (!isSuccessEnvelope(envelope)) return;

    const body = JSON.stringify({
      ...envelope,
      meta: { ...envelope.meta, cachedAt: Date.now() },
    });
    if (!storeCacheEntry(cache, key, body, CACHE_TTL[request.operation])) return;

    // Hono merges old response headers on assignment; clear body-dependent headers first.
    c.header('content-length', undefined);
    c.header('etag', undefined);
    c.res = new Response(body, { status: 200, headers: new Headers(c.res.headers) });
  };
}
