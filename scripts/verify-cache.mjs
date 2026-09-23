import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { Hono } from 'hono';
import {
  buildCacheKey, cacheEntryBytes, CACHE_MAX_BYTES, CACHE_MAX_ITEMS, CACHE_TTL,
  createResponseCache, storeCacheEntry,
} from '../server/dist/services/cache.service.js';
import { cacheMiddleware } from '../server/dist/middlewares/cacheMiddleware.js';
import { ProviderError } from '../server/dist/errors/provider.error.js';

const provider = { name: 'meionovel', baseUrl: 'https://meionovels.com' };
const key = (request) => buildCacheKey(provider, request);
const success = (data) => ({ success: true, data, error: null, meta: { source: provider.name } });

assert.equal(CACHE_MAX_ITEMS, 500);
assert.equal(CACHE_MAX_BYTES, 100_000_000);
assert.deepEqual(CACHE_TTL, {
  popular: 21_600_000, latest: 900_000, search: 1_800_000,
  detail: 43_200_000, chapter: 604_800_000,
});
assert.equal(key({ operation: 'latest' }), key({ operation: 'latest', page: 1 }));
assert.equal(key({ operation: 'search', query: ' kimi ' }), key({ operation: 'search', query: 'kimi', page: 1 }));
const distinct = [
  key({ operation: 'popular' }),
  key({ operation: 'latest', page: 1 }),
  key({ operation: 'latest', page: 2 }),
  key({ operation: 'search', query: 'kimi' }),
  key({ operation: 'search', query: 'Kimi' }),
  key({ operation: 'search', query: 'kimi', page: 2 }),
  key({ operation: 'search', query: '君|"[]' }),
  key({ operation: 'detail', novelId: 'btth' }),
  key({ operation: 'chapter', novelId: 'btth', chapterId: 'mtl/chapter-1' }),
  key({ operation: 'chapter', novelId: 'btth', chapterId: 'chapter-1' }),
  key({ operation: 'chapter', novelId: 'other', chapterId: 'mtl/chapter-1' }),
  key({ operation: 'chapter', novelId: 'a_b', chapterId: 'c' }),
  key({ operation: 'chapter', novelId: 'a', chapterId: 'b_c' }),
  buildCacheKey({ ...provider, name: 'other' }, { operation: 'popular' }),
  buildCacheKey({ ...provider, baseUrl: 'http://localhost:1234' }, { operation: 'popular' }),
];
assert.equal(new Set(distinct).size, distinct.length);
for (const request of [
  { operation: 'latest', page: 0 }, { operation: 'latest', page: NaN },
  { operation: 'search', query: 'kimi', page: 1.5 },
  { operation: 'chapter', novelId: 'btth', chapterId: 'mtl/../chapter-1' },
  { operation: 'detail', novelId: '../btth' },
]) assert.throws(() => key(request), (error) => error.code === 'BAD_REQUEST');
console.log('PASS: policy constants, canonical keys, parameter validation and key isolation');

const countCache = createResponseCache();
for (let i = 0; i < 500; i++) storeCacheEntry(countCache, `key-${i}`, '{}', 10000);
assert.equal(countCache.get('key-0'), '{}');
storeCacheEntry(countCache, 'key-500', '{}', 10000);
assert.equal(countCache.size, 500);
assert.equal(countCache.get('key-1'), undefined);
assert.equal(countCache.get('key-0'), '{}');
assert.equal(countCache.get('key-500'), '{}');
assert.equal(createResponseCache().size, 0);

const byteCache = createResponseCache({ max: 500, maxSize: 24 });
assert.equal(cacheEntryBytes('君', 'é'), 5);
for (const k of ['a', 'b', 'c']) storeCacheEntry(byteCache, k, '君君', 10000);
byteCache.get('a');
storeCacheEntry(byteCache, 'd', '君君', 10000);
assert.equal(byteCache.get('b'), undefined);
assert.equal(byteCache.size, 3);
assert.equal(byteCache.calculatedSize, 21);
assert(byteCache.calculatedSize <= byteCache.maxSize);
assert.equal(storeCacheEntry(byteCache, 'huge', 'x'.repeat(25), 10000), false);
assert.equal(storeCacheEntry(byteCache, 'a', 'x'.repeat(25), 10000), false);
assert.equal(byteCache.size, 3);
assert.equal(byteCache.get('a'), '君君');
const boundaryCache = createResponseCache({ maxSize: 5 });
assert.equal(storeCacheEntry(boundaryCache, '君', 'é', 10000), true);
assert.equal(boundaryCache.calculatedSize, 5);
console.log('PASS: 501 insertions, LRU recency, byte eviction, Unicode size and oversized bypass');

const expiryCache = createResponseCache();
storeCacheEntry(expiryCache, 'fixed', '{}', 120);
const before = expiryCache.getRemainingTTL('fixed');
await delay(35);
expiryCache.get('fixed');
expiryCache.has('fixed');
const after = expiryCache.getRemainingTTL('fixed');
assert(after < before - 15, 'Access must not renew TTL');
await delay(140);
assert.equal(expiryCache.get('fixed'), undefined);
console.log('PASS: expiration and fixed TTL on get/has');

const cache = createResponseCache();
function testApp() {
  const app = new Hono();
  app.onError((error, c) => c.json({ success: false, data: null, error: { code: error.code ?? 'INTERNAL_SERVER_ERROR' } }, error.status ?? 500));
  return app;
}
const app = testApp();
const calls = new Map();
const count = (name) => calls.set(name, (calls.get(name) ?? 0) + 1);
const requests = [
  { operation: 'popular' }, { operation: 'latest', page: 1 },
  { operation: 'search', query: 'kimi', page: 1 },
  { operation: 'detail', novelId: 'btth' },
  { operation: 'chapter', novelId: 'btth', chapterId: 'mtl/chapter-1' },
];
for (const request of requests) {
  const route = `/${request.operation}`;
  app.get(route, cacheMiddleware(provider, () => request, cache), (c) => {
    count(route);
    return c.json({ ...success([]), meta: { source: provider.name, page: 1, hasNextPage: false } });
  });
}
for (const request of requests) {
  const route = `/${request.operation}`;
  const first = await app.request(route);
  const firstBody = await first.text();
  const firstParsed = JSON.parse(firstBody);
  assert.equal(firstParsed.meta.source, provider.name);
  assert.equal(firstParsed.meta.hasNextPage, false);
  assert.equal(firstParsed.meta.page, 1);
  assert.equal(typeof firstParsed.meta.cachedAt, 'number');
  assert.deepEqual(firstParsed.data, []);
  assert.equal(await (await app.request(route)).text(), firstBody);
  assert.equal(calls.get(route), 1);
  const ttl = cache.getRemainingTTL(key(request));
  assert(ttl > CACHE_TTL[request.operation] - 2000 && ttl <= CACHE_TTL[request.operation]);
  firstParsed.data.push('local mutation');
  assert.deepEqual((await (await app.request(route)).json()).data, []);
}

const hitTimes = [];
for (let i = 0; i < 30; i++) {
  const start = performance.now();
  await (await app.request('/chapter')).text();
  hitTimes.push(performance.now() - start);
}
const maxHitMs = Math.max(...hitTimes);
assert(maxHitMs < 150, `Cache hit exceeded 150ms: ${maxHitMs}`);
assert.equal(calls.get('/chapter'), 1);
console.log(`PASS: all 5 policies, success envelopes, empty data, immutable body, cache-hit max ${maxHitMs.toFixed(2)}ms (30 Hono in-process requests; ${process.version}, ${process.platform}/${process.arch})`);

const popularKey = key({ operation: 'popular' });
const oldBody = cache.get(popularKey);
cache.set(popularKey, oldBody, { ttl: 20 });
await delay(50);
const renewed = await (await app.request('/popular')).json();
assert.equal(calls.get('/popular'), 2);
assert(renewed.meta.cachedAt > JSON.parse(oldBody).meta.cachedAt);

let validationCalls = 0;
const validationApp = testApp();
validationApp.get('/validated', cacheMiddleware(provider, (c) => ({ operation: 'latest', page: Number(c.req.query('page') ?? 1) }), cache), (c) => {
  validationCalls++;
  return c.json(success([]));
});
assert.equal((await validationApp.request('/validated?page=0')).status, 400);
assert.equal(validationCalls, 0);
console.log('PASS: expired hit reloads upstream and invalid requests cannot bypass validation');

const headerApp = testApp();
headerApp.use('*', async (c, next) => { c.header('X-Outer', 'retained'); await next(); });
headerApp.get('/headers', cacheMiddleware(provider, () => ({ operation: 'detail', novelId: 'headers' }), cache), (c) => {
  const body = JSON.stringify(success([]));
  return c.body(body, 200, {
    'Content-Type': 'application/json', 'Content-Length': String(Buffer.byteLength(body)), ETag: 'old-body',
  });
});
for (let i = 0; i < 2; i++) {
  const res = await headerApp.request('/headers');
  assert.equal(res.headers.get('content-length'), null);
  assert.equal(res.headers.get('etag'), null);
  assert.equal(res.headers.get('x-outer'), 'retained');
  assert.equal(typeof (await res.json()).meta.cachedAt, 'number');
}
console.log('PASS: rewritten JSON has no stale Content-Length/ETag; outer middleware headers preserved');

const bypassCases = [
  ['error-status', (c) => c.json({ success: false, data: null, error: { code: 'PROVIDER_BLOCKED' } }, 503)],
  ['error-envelope', (c) => c.json({ success: false, data: null, error: { code: 'PROVIDER_TIMEOUT' } })],
  ['html', (c) => c.html('<p>not JSON</p>')],
  ['invalid-json', (c) => c.body('{', 200, { 'Content-Type': 'application/json' })],
  ['invalid-envelope', (c) => c.json({ success: true })],
  ['private', (c) => { c.header('Cache-Control', 'private'); return c.json(success([])); }],
  ['cookie', (c) => { c.header('Set-Cookie', 'test=1'); return c.json(success([])); }],
];
for (const [name, handler] of bypassCases) {
  const bypassApp = testApp();
  const req = { operation: 'detail', novelId: name };
  bypassApp.get(`/${name}`, cacheMiddleware(provider, () => req, cache), (c) => { count(name); return handler(c); });
  await bypassApp.request(`/${name}`);
  await bypassApp.request(`/${name}`);
  assert.equal(calls.get(name), 2);
  assert.equal(cache.get(key(req)), undefined);
}
let fail = true;
const failingApp = testApp();
const failingRequest = { operation: 'detail', novelId: 'failing' };
failingApp.get('/failing', cacheMiddleware(provider, () => failingRequest, cache), (c) => {
  count('failing');
  if (fail) throw new ProviderError('PROVIDER_TIMEOUT', 'mock timeout', 504);
  return c.json(success({ title: 'Recovered' }));
});
assert.equal((await failingApp.request('/failing')).status, 504);
assert.equal(cache.get(key(failingRequest)), undefined);
fail = false;
assert.equal((await failingApp.request('/failing')).status, 200);
await failingApp.request('/failing');
assert.equal(calls.get('failing'), 2);
cache.set(key(failingRequest), cache.get(key(failingRequest)), { ttl: 20 });
await delay(50);
fail = true;
assert.equal((await failingApp.request('/failing')).status, 504, 'Expired success must not hide upstream failure');
assert.equal(cache.get(key(failingRequest)), undefined);

const postApp = testApp();
postApp.post('/popular', cacheMiddleware(provider, () => ({ operation: 'popular' }), cache), (c) => {
  count('post');
  return c.json(success('POST'));
});
await postApp.request('/popular', { method: 'POST' });
await postApp.request('/popular', { method: 'POST' });
assert.equal(calls.get('post'), 2);

const smallCache = createResponseCache({ maxSize: 250 });
storeCacheEntry(smallCache, 'keep', '{}', 10000);
const largeRequest = { operation: 'detail', novelId: 'large' };
const largeApp = testApp();
largeApp.get('/large', cacheMiddleware(provider, () => largeRequest, smallCache), (c) => {
  count('large');
  return c.json(success('x'.repeat(300)));
});
for (let i = 0; i < 2; i++) {
  const response = await largeApp.request('/large');
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.meta.cachedAt, undefined);
  assert.equal(body.data.length, 300);
}
assert.equal(calls.get('large'), 2);
assert.equal(smallCache.size, 1);
assert.equal(smallCache.get('keep'), '{}');
console.log('PASS: failed/non-JSON/private responses and POST bypass cache, errors recover, stale data never served, oversized response preserved');
console.log('ALL BE-05 CACHE CHECKS PASSED');
