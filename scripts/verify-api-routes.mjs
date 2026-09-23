import assert from 'node:assert/strict';
import { createApp } from '../server/dist/app.js';
import { createResponseCache, CACHE_TTL } from '../server/dist/services/cache.service.js';
import { ProviderError } from '../server/dist/errors/provider.error.js';
import { meionovelProvider } from '../server/dist/providers/index.js';

const isLive = process.argv.includes('--live');

console.log('=== [BE-06] Hono REST API Router & Global Error Handler Verification ===');
console.log(`Mode: ${isLive ? 'LIVE UPSTREAM SMOKE TESTS' : 'OFFLINE UNIT & MOCK TESTS'}\n`);

// ---------------------------------------------------------------------------
// 1. Mock Provider Setup for Deterministic Offline Tests
// ---------------------------------------------------------------------------
class MockProvider {
  constructor() {
    this.name = 'mock-provider';
    this.baseUrl = 'https://mock.example.com';
    this.calls = {
      getTrending: 0,
      getLatest: 0,
      search: 0,
      getNovelDetails: 0,
      getChapterContent: 0,
    };
    this.receivedParams = {};
    this.errorToThrow = null;
  }

  resetCalls() {
    this.calls = {
      getTrending: 0,
      getLatest: 0,
      search: 0,
      getNovelDetails: 0,
      getChapterContent: 0,
    };
    this.receivedParams = {};
    this.errorToThrow = null;
  }

  async getTrending() {
    this.calls.getTrending++;
    if (this.errorToThrow) throw this.errorToThrow;
    return [
      { id: 'popular-1', title: 'Popular Novel 1', coverUrl: 'https://example.com/c1.jpg' },
      { id: 'popular-2', title: 'Popular Novel 2', coverUrl: 'https://example.com/c2.jpg' },
    ];
  }

  async getLatest(page = 1) {
    this.calls.getLatest++;
    this.receivedParams.latestPage = page;
    if (this.errorToThrow) throw this.errorToThrow;
    return [
      { id: 'latest-1', title: 'Latest Novel 1', coverUrl: 'https://example.com/l1.jpg' },
    ];
  }

  async search(query, page = 1) {
    this.calls.search++;
    this.receivedParams.searchQuery = query;
    this.receivedParams.searchPage = page;
    if (this.errorToThrow) throw this.errorToThrow;
    return [
      { id: 'search-1', title: `Result for ${query}`, coverUrl: 'https://example.com/s1.jpg' },
    ];
  }

  async getNovelDetails(novelId) {
    this.calls.getNovelDetails++;
    this.receivedParams.novelId = novelId;
    if (this.errorToThrow) throw this.errorToThrow;
    return {
      id: novelId,
      title: `Detail of ${novelId}`,
      coverUrl: 'https://example.com/cov.jpg',
      synopsis: 'A test novel synopsis',
      status: 'Ongoing',
      chapters: [
        { id: 'chapter-1', title: 'Chapter 1', chapterNumber: 1 },
      ],
    };
  }

  async getChapterContent(novelId, chapterId) {
    this.calls.getChapterContent++;
    this.receivedParams.novelId = novelId;
    this.receivedParams.chapterId = chapterId;
    if (this.errorToThrow) throw this.errorToThrow;
    return {
      id: chapterId,
      novelId,
      title: `Chapter ${chapterId}`,
      chapterNumber: 1,
      blocks: [
        { id: 'b_001', type: 'paragraph', spans: [{ text: 'Cerita bab.' }] },
      ],
      images: [],
      prevChapterId: null,
      nextChapterId: null,
    };
  }
}

const mock = new MockProvider();
const isolatedCache = createResponseCache();
const app = createApp({ provider: mock, cache: isolatedCache });

// ---------------------------------------------------------------------------
// 2. Health Check & API Envelope Integrity
// ---------------------------------------------------------------------------
console.log('--- 1. Testing Health Check & Envelope Integrity ---');

// 1A. /health endpoint: legacy structure preserved as documented API exception
const healthRes = await app.request('/health');
assert.strictEqual(healthRes.status, 200, '/health must return 200 OK');
const healthBody = await healthRes.json();
assert.deepStrictEqual(healthBody, { status: 'ok', service: 'yomou-server' });
console.log('✔ /health endpoint preserved as documented API envelope exception');

// 1B. GET /api/novels/popular
mock.resetCalls();
const popRes = await app.request('/api/novels/popular');
assert.strictEqual(popRes.status, 200);
const popBody = await popRes.json();
assert.strictEqual(popBody.success, true);
assert.strictEqual(popBody.error, null);
assert.strictEqual(popBody.data.length, 2);
assert.strictEqual(popBody.meta.source, mock.name);
assert.strictEqual(typeof popBody.meta.cachedAt, 'number');
console.log('✔ GET /api/novels/popular envelope and meta verified');

// 1C. GET /api/novels/latest with explicit and default page
mock.resetCalls();
const latestRes = await app.request('/api/novels/latest?page=2');
assert.strictEqual(latestRes.status, 200);
const latestBody = await latestRes.json();
assert.strictEqual(latestBody.meta.page, 2);
assert.strictEqual(mock.receivedParams.latestPage, 2);
// Pagination reality: totalPages and hasNextPage must NOT be fabricated
assert.strictEqual(latestBody.meta.totalPages, undefined);
assert.strictEqual(latestBody.meta.hasNextPage, undefined);

// Default page = 1 when omitted
const latestDefaultRes = await app.request('/api/novels/latest');
assert.strictEqual(latestDefaultRes.status, 200);
const latestDefaultBody = await latestDefaultRes.json();
assert.strictEqual(latestDefaultBody.meta.page, 1);
assert.strictEqual(mock.receivedParams.latestPage, 1);
console.log('✔ GET /api/novels/latest page handling & factual pagination verified (no fabricated totalPages)');

// 1D. GET /api/novels/search with query and page
mock.resetCalls();
const searchRes = await app.request('/api/novels/search?q=solo%20leveling&page=3');
assert.strictEqual(searchRes.status, 200);
const searchBody = await searchRes.json();
assert.strictEqual(searchBody.meta.page, 3);
assert.strictEqual(mock.receivedParams.searchQuery, 'solo leveling');
assert.strictEqual(mock.receivedParams.searchPage, 3);
assert.strictEqual(searchBody.meta.totalPages, undefined);
assert.strictEqual(searchBody.meta.hasNextPage, undefined);
console.log('✔ GET /api/novels/search query & page handling verified');

// 1E. Route ordering: /popular, /latest, /search must NOT be captured as :novelId
mock.resetCalls();
await app.request('/api/novels/popular');
await app.request('/api/novels/latest');
await app.request('/api/novels/search?q=test');
assert.strictEqual(mock.calls.getNovelDetails, 0, 'Static routes must not be captured as :novelId');
console.log('✔ Route order strictly distinguishes static routes (/popular, /latest, /search) before :novelId\n');

// ---------------------------------------------------------------------------
// 3. Subpath chapterId & Single URI Decoding
// ---------------------------------------------------------------------------
console.log('--- 2. Testing Subpath chapterId & Single URI Decoding ---');

// 2A. Literal slash in chapterId
mock.resetCalls();
const subpathLitRes = await app.request('/api/novels/btth/chapters/mtl/chapter-1');
assert.strictEqual(subpathLitRes.status, 200);
assert.strictEqual(mock.receivedParams.novelId, 'btth');
assert.strictEqual(mock.receivedParams.chapterId, 'mtl/chapter-1');

// 2B. Percent-encoded slash in chapterId (%2F) cold fetch
mock.resetCalls();
const subpathEncRes = await app.request('/api/novels/kimi/chapters/vol%2Fchapter-1');
assert.strictEqual(subpathEncRes.status, 200);
assert.strictEqual(mock.receivedParams.novelId, 'kimi');
assert.strictEqual(mock.receivedParams.chapterId, 'vol/chapter-1');
console.log('✔ Wildcard pattern captures subpath chapterId with both literal slash and %2F accurately');

// 2C. Cache key equivalence for literal and encoded slash
const cacheLit = createResponseCache();
const appCache = createApp({ provider: mock, cache: cacheLit });
mock.resetCalls();
const cRes1 = await appCache.request('/api/novels/btth/chapters/mtl/chapter-1');
assert.strictEqual(cRes1.status, 200);
assert.strictEqual(mock.calls.getChapterContent, 1);

// Second request with encoded slash must HIT the same cache key
const cRes2 = await appCache.request('/api/novels/btth/chapters/mtl%2Fchapter-1');
assert.strictEqual(cRes2.status, 200);
assert.strictEqual(mock.calls.getChapterContent, 1, 'Encoded slash must hit identical cache key');
console.log('✔ Literal and encoded slash resolve to identical chapterId & cache entry\n');

// ---------------------------------------------------------------------------
// 4. Input Validation & Parameter Guards (400 BAD_REQUEST)
// ---------------------------------------------------------------------------
console.log('--- 3. Testing Input Validation & Traversal Guards (400 BAD_REQUEST) ---');

// 3A. Page validation: decimal digits only, safe integer >= 1
const invalidPages = [
  '0',
  '-1',
  '1.5',
  'abc',
  '1e2',
  '0x10',
  '9007199254740992', // > MAX_SAFE_INTEGER
  '',
];
for (const p of invalidPages) {
  mock.resetCalls();
  const res = await app.request(`/api/novels/latest?page=${p}`);
  assert.strictEqual(res.status, 400, `Page "${p}" must return 400`);
  const body = await res.json();
  assert.strictEqual(body.success, false);
  assert.strictEqual(body.error.code, 'BAD_REQUEST');
  assert.strictEqual(mock.calls.getLatest, 0, 'Invalid page must not call provider');
}
console.log('✔ Invalid page values (0, negative, decimal, exponent, hex, overflow) rejected with 400');

// 3B. Repeated page query parameter
mock.resetCalls();
const multiPageRes = await app.request('/api/novels/latest?page=1&page=2');
assert.strictEqual(multiPageRes.status, 400, 'Repeated page parameter must return 400');
assert.strictEqual(mock.calls.getLatest, 0);

// 3C. Search query validation: missing, empty, whitespace, repeated
const invalidQueries = [
  '/api/novels/search',
  '/api/novels/search?q=',
  '/api/novels/search?q=%20%20',
  '/api/novels/search?q=first&q=second',
];
for (const url of invalidQueries) {
  mock.resetCalls();
  const res = await app.request(url);
  assert.strictEqual(res.status, 400, `Search URL "${url}" must return 400`);
  assert.strictEqual(mock.calls.search, 0);
}
console.log('✔ Invalid or repeated search queries rejected with 400');

// 3D. Path traversal on novelId reaching validator
mock.resetCalls();
const travNovelRes = await app.request('/api/novels/..%2Fnovel');
assert.strictEqual(travNovelRes.status, 400);
assert.strictEqual(mock.calls.getNovelDetails, 0);

// 3E. Path traversal and malformed chapterId reaching validator
const invalidChapters = [
  '/api/novels/btth/chapters/..%2Fchapter-1',
  '/api/novels/btth/chapters/mtl%2F..%2Fchapter-1',
  '/api/novels/btth/chapters/%252e%252e',
  '/api/novels/btth/chapters/mtl%2F%252e%252e%2Fch-1',
  '/api/novels/btth/chapters/mtl//ch-1',
  '/api/novels/btth/chapters/ch%201',
];
for (const url of invalidChapters) {
  mock.resetCalls();
  const res = await app.request(url);
  assert.strictEqual(res.status, 400, `Chapter URL "${url}" must return 400`);
  assert.strictEqual(mock.calls.getChapterContent, 0, 'Invalid chapterId must not call provider');
}
console.log('✔ Encoded traversal & malformed chapterId reaching validator rejected with 400');

// Note on URL normalization: verify separate Request/URL normalization behavior
// Standard Request normalizes literal `/..` in the path before Hono matches it.
const normalizedLitRes = await app.request('/api/novels/btth/chapters/..');
// Normalized by Request to /api/novels/btth/ which maps to novel details or 404
assert(normalizedLitRes.status === 200 || normalizedLitRes.status === 404);
console.log('✔ URL/Request normalization behavior for literal ".." documented and tested separately\n');

// ---------------------------------------------------------------------------
// 5. Information Leak & Security Tests
// ---------------------------------------------------------------------------
console.log('--- 4. Testing Information Leak Prevention & Sanitized Details ---');

// 4A. ProviderError containing internal URL or path in message
mock.resetCalls();
mock.errorToThrow = new ProviderError(
  'SCRAPER_PARSE_ERROR',
  'Internal failure at https://meionovels.com/secret/upstream/api?token=secret123 in D:\\project\\yomou\\server\\src\\parser.ts',
  500,
  {
    novelId: 'safe-novel-id',
    chapterId: 'safe-chapter-id',
    rawHref: 'https://meionovels.com/leaked-link',
    secretKey: 'sensitive-token-1234',
    stack: 'Error: at line 42...',
  }
);

const leakRes = await app.request('/api/novels/test-novel');
assert.strictEqual(leakRes.status, 500);
const leakText = await leakRes.text();

// Must NOT contain internal URLs, tokens, file paths, or stack traces
assert(!leakText.includes('meionovels.com'), 'Must not leak upstream URL');
assert(!leakText.includes('secret123'), 'Must not leak secret token from message');
assert(!leakText.includes('sensitive-token-1234'), 'Must not leak secret token from details');
assert(!leakText.includes('D:\\project\\yomou'), 'Must not leak server filesystem paths');
assert(!leakText.includes('parser.ts'), 'Must not leak internal filenames');
assert(!leakText.includes('stack'), 'Must not contain stack field');

const leakJson = JSON.parse(leakText);
assert.strictEqual(leakJson.error.code, 'SCRAPER_PARSE_ERROR');
assert.strictEqual(leakJson.error.message, 'Gagal memproses struktur data dari penyedia novel.');
// Only allowed primitive keys must be retained in details
assert.deepStrictEqual(leakJson.error.details, {
  novelId: 'safe-novel-id',
  chapterId: 'safe-chapter-id',
});
console.log('✔ Upstream URLs, secret tokens, file paths, and stacks strictly masked in ProviderError');

// 4B. Semantic validation of error details (rejects Windows paths, URIs with credentials, nested objects)
mock.resetCalls();
mock.errorToThrow = new ProviderError(
  'PROVIDER_NOT_FOUND',
  'Raw message to be masked',
  404,
  {
    novelId: 'D:\\project\\yomou\\server\\secret.txt', // Windows path
    chapterId: 'postgresql://user:password@host/db', // URI with credentials
    page: 1.5, // float, not safe integer
    direction: 'upstream', // invalid direction
    extraNested: { secret: 'nested' }, // nested object
  }
);
const semanticRes = await app.request('/api/novels/test-novel');
assert.strictEqual(semanticRes.status, 404);
const semanticText = await semanticRes.text();
const semanticJson = JSON.parse(semanticText);
assert.strictEqual(semanticJson.error.details, null, 'Unsafe/non-canonical details must be completely omitted');
assert(!semanticText.includes('secret.txt'), 'Must not leak file path');
assert(!semanticText.includes('password'), 'Must not leak credentials');
assert(!semanticText.includes('postgresql'), 'Must not leak URI scheme');

// 4C. Valid canonical details preserved accurately
mock.resetCalls();
mock.errorToThrow = new ProviderError(
  'PROVIDER_NOT_FOUND',
  'Raw message to be masked',
  404,
  {
    novelId: 'valid-novel-slug',
    chapterId: 'mtl/valid-chapter-1',
    page: 2,
    direction: 'next',
  }
);
const validDetailsRes = await app.request('/api/novels/test-novel');
assert.strictEqual(validDetailsRes.status, 404);
const validDetailsJson = await validDetailsRes.json();
assert.deepStrictEqual(validDetailsJson.error.details, {
  novelId: 'valid-novel-slug',
  chapterId: 'mtl/valid-chapter-1',
  page: 2,
  direction: 'next',
});
console.log('✔ Error details semantically sanitized (Windows paths, URIs with credentials, nested objects rejected)');

// 4D. Generic unexpected Error
mock.resetCalls();
mock.errorToThrow = new Error('Database explosion at postgresql://user:pass@192.168.1.5:5432/db');
const genRes = await app.request('/api/novels/test-novel');
assert.strictEqual(genRes.status, 500);
const genText = await genRes.text();
assert(!genText.includes('Database explosion'));
assert(!genText.includes('192.168.1.5'));
assert(!genText.includes('user:pass'));

const genJson = JSON.parse(genText);
assert.strictEqual(genJson.error.code, 'INTERNAL_SERVER_ERROR');
assert.strictEqual(genJson.error.message, 'Terjadi kesalahan internal pada server.');
assert.strictEqual(genJson.error.details, null);
console.log('✔ Generic exceptions completely masked with generic public message & no details');

// 4E. Route 404 Not Found
const notFoundRes = await app.request('/api/novels/nonexistent/subroute/path');
assert.strictEqual(notFoundRes.status, 404);
const notFoundJson = await notFoundRes.json();
assert.strictEqual(notFoundJson.success, false);
assert.strictEqual(notFoundJson.error.code, 'PROVIDER_NOT_FOUND');
assert.strictEqual(notFoundJson.error.message, 'Rute tidak ditemukan.');
assert.strictEqual(notFoundJson.error.details, null);
console.log('✔ Unhandled routes return 404 with structured PROVIDER_NOT_FOUND envelope\n');

// ---------------------------------------------------------------------------
// 6. Error Mapping to Canonical Status Codes & Status Normalization
// ---------------------------------------------------------------------------
console.log('--- 5. Testing Error Code Mapping to Canonical HTTP Statuses ---');

// Critical regression: NETWORK_UNREACHABLE with status 502 from httpClient MUST be mapped to 503 on API layer
mock.resetCalls();
mock.errorToThrow = new ProviderError(
  'NETWORK_UNREACHABLE',
  'Upstream network unreachable (ECONNRESET): https://meionovels.com/novel/btth/',
  502, // Initial status from httpClient.ts:240
  { url: 'https://meionovels.com/novel/btth/', code: 'ECONNRESET', attempts: 3 }
);
const netUnreachRes = await app.request('/api/novels/test-novel');
assert.strictEqual(netUnreachRes.status, 503, 'NETWORK_UNREACHABLE with 502 must be normalized to 503');
const netUnreachJson = await netUnreachRes.json();
assert.strictEqual(netUnreachJson.error.code, 'NETWORK_UNREACHABLE');
assert.strictEqual(netUnreachJson.error.message, 'Gagal terhubung ke jaringan penyedia novel.');
assert.strictEqual(netUnreachJson.error.details, null, 'Unsafe details (url, code) must be stripped');
console.log('✔ Regression: NETWORK_UNREACHABLE with internal 502 strictly normalized to 503 at API layer');

const errorMappings = [
  ['CHAPTER_EMPTY_CONTENT', 422, 'Konten bab tidak ditemukan atau kosong dari sumber web.'],
  ['PROVIDER_NOT_FOUND', 404, 'Data novel atau bab yang diminta tidak ditemukan.'],
  ['PROVIDER_BLOCKED', 503, 'Akses ke penyedia novel dibatasi atau terhalang proteksi.'],
  ['NETWORK_UNREACHABLE', 503, 'Gagal terhubung ke jaringan penyedia novel.'],
  ['PROVIDER_TIMEOUT', 504, 'Batas waktu permintaan ke penyedia novel terlampaui.'],
  ['SCRAPER_PARSE_ERROR', 500, 'Gagal memproses struktur data dari penyedia novel.'],
];

for (const [code, expectedStatus, expectedMessage] of errorMappings) {
  mock.resetCalls();
  mock.errorToThrow = new ProviderError(code, 'Raw message to be masked', expectedStatus);
  const res = await app.request('/api/novels/test-novel');
  assert.strictEqual(res.status, expectedStatus, `Code ${code} must map to ${expectedStatus}`);
  const json = await res.json();
  assert.strictEqual(json.error.code, code);
  assert.strictEqual(json.error.message, expectedMessage);
}
console.log('✔ All canonical ErrorCodes mapped to accurate HTTP status codes with fixed public messages\n');

// ---------------------------------------------------------------------------
// 7. Cache Hit / Miss & Validation Guard Tests
// ---------------------------------------------------------------------------
console.log('--- 6. Testing Cache Hit/Miss & Validation Precedence ---');

const testCache = createResponseCache();
const cacheApp = createApp({ provider: mock, cache: testCache });

// 6A. First request: Miss, calls provider, records cachedAt
mock.resetCalls();
const firstRes = await cacheApp.request('/api/novels/popular');
assert.strictEqual(firstRes.status, 200);
assert.strictEqual(mock.calls.getTrending, 1);
const firstJson = await firstRes.json();
assert.strictEqual(typeof firstJson.meta.cachedAt, 'number');

// 6B. Second request: Hit, returns < 150ms without calling provider
const tStart = performance.now();
const secondRes = await cacheApp.request('/api/novels/popular');
const tElapsed = performance.now() - tStart;
assert.strictEqual(secondRes.status, 200);
assert.strictEqual(mock.calls.getTrending, 1, 'Provider must not be called on cache hit');
assert(tElapsed < 150, `Cache hit must be < 150ms (got ${tElapsed.toFixed(2)}ms)`);
const secondJson = await secondRes.json();
assert.strictEqual(secondJson.meta.cachedAt, firstJson.meta.cachedAt);
console.log(`✔ Cache hit verified (< 150ms, elapsed: ${tElapsed.toFixed(2)}ms) without provider reload`);

// 6C. Errors must NOT be cached
mock.resetCalls();
mock.errorToThrow = new ProviderError('PROVIDER_TIMEOUT', 'Timeout', 504);
const errRes1 = await cacheApp.request('/api/novels/err-novel');
assert.strictEqual(errRes1.status, 504);
assert.strictEqual(mock.calls.getNovelDetails, 1);

// Recover provider: subsequent request must reach provider, not serve cached error
mock.errorToThrow = null;
const errRes2 = await cacheApp.request('/api/novels/err-novel');
assert.strictEqual(errRes2.status, 200);
assert.strictEqual(mock.calls.getNovelDetails, 2, 'Errors must not be cached');
console.log('✔ Upstream errors are never cached; subsequent requests recover smoothly');

// 6D. Validation runs before cache lookup
mock.resetCalls();
const valRes = await cacheApp.request('/api/novels/latest?page=0');
assert.strictEqual(valRes.status, 400);
assert.strictEqual(mock.calls.getLatest, 0);
console.log('✔ Validation strictly executes before cache lookup on all routes\n');

// ---------------------------------------------------------------------------
// 8. Live Smoke Testing on Upstream (Only when --live flag is passed)
// ---------------------------------------------------------------------------
if (isLive) {
  console.log('--- 7. Live Smoke Testing on Upstream (meionovels.com) ---');

  const liveCache = createResponseCache();
  const liveApp = createApp({ provider: meionovelProvider, cache: liveCache });

  try {
    // 7A. Live Health
    const lHealth = await liveApp.request('/health');
    assert.strictEqual(lHealth.status, 200);
    console.log('✔ Live /health responded 200');

    // 7B. Live Popular
    console.log('Fetching live GET /api/novels/popular...');
    const lPop = await liveApp.request('/api/novels/popular');
    assert.strictEqual(lPop.status, 200);
    const lPopJson = await lPop.json();
    assert.strictEqual(lPopJson.success, true);
    assert(Array.isArray(lPopJson.data) && lPopJson.data.length > 0);
    console.log(`✔ Live popular novels verified (${lPopJson.data.length} items)`);

    // 7C. Live Latest
    console.log('Fetching live GET /api/novels/latest?page=1...');
    const lLatest = await liveApp.request('/api/novels/latest?page=1');
    assert.strictEqual(lLatest.status, 200);
    const lLatestJson = await lLatest.json();
    assert.strictEqual(lLatestJson.success, true);
    assert(Array.isArray(lLatestJson.data) && lLatestJson.data.length > 0);
    assert.strictEqual(lLatestJson.meta.page, 1);
    console.log(`✔ Live latest novels verified (${lLatestJson.data.length} items)`);

    // 7D. Live Search
    console.log('Fetching live GET /api/novels/search?q=kimi...');
    const lSearch = await liveApp.request('/api/novels/search?q=kimi&page=1');
    assert.strictEqual(lSearch.status, 200);
    const lSearchJson = await lSearch.json();
    assert.strictEqual(lSearchJson.success, true);
    assert(Array.isArray(lSearchJson.data) && lSearchJson.data.length > 0);
    console.log(`✔ Live search verified (${lSearchJson.data.length} items)`);

    // 7E. Live Novel Detail
    console.log('Fetching live GET /api/novels/kimi-wa-boku-no-koukai-ln...');
    const lDetail = await liveApp.request('/api/novels/kimi-wa-boku-no-koukai-ln');
    assert.strictEqual(lDetail.status, 200);
    const lDetailJson = await lDetail.json();
    assert.strictEqual(lDetailJson.success, true);
    assert(lDetailJson.data.chapters.length >= 63);
    console.log(`✔ Live novel details verified (${lDetailJson.data.chapters.length} chapters)`);

    // 7F. Live Chapter Content
    console.log('Fetching live GET /api/novels/kimi-wa-boku-no-koukai-ln/chapters/volume-1-chapter-1...');
    const lChap = await liveApp.request('/api/novels/kimi-wa-boku-no-koukai-ln/chapters/volume-1-chapter-1');
    assert.strictEqual(lChap.status, 200);
    const lChapJson = await lChap.json();
    assert.strictEqual(lChapJson.success, true);
    assert(lChapJson.data.blocks.length > 0);
    console.log(`✔ Live chapter content verified (${lChapJson.data.blocks.length} blocks)`);

    // 7G. Live Subpath Chapter Content (BTTH MTL)
    console.log('Fetching live GET /api/novels/btth/chapters/mtl/chapter-1...');
    const lSubChap = await liveApp.request('/api/novels/btth/chapters/mtl/chapter-1');
    assert.strictEqual(lSubChap.status, 200);
    const lSubChapJson = await lSubChap.json();
    assert.strictEqual(lSubChapJson.success, true);
    assert(lSubChapJson.data.blocks.length > 0);
    console.log(`✔ Live subpath chapter content verified (${lSubChapJson.data.blocks.length} blocks)`);

    // 7H. Live Non-Existent Novel -> 404
    console.log('Fetching live GET /api/novels/non-existent-novel-12345...');
    const l404 = await liveApp.request('/api/novels/non-existent-novel-12345');
    assert.strictEqual(l404.status, 404);
    const l404Json = await l404.json();
    assert.strictEqual(l404Json.error.code, 'PROVIDER_NOT_FOUND');
    console.log('✔ Live non-existent novel correctly returns 404 PROVIDER_NOT_FOUND');

    console.log('\n=== LIVE SMOKE TESTS COMPLETED (ALL PASSED) ===\n');
  } catch (error) {
    console.error('FAILED: Live smoke test encountered an error:', error);
    process.exit(1);
  }
} else {
  console.log('=== OFFLINE UNIT & MOCK TESTS COMPLETED (ALL PASSED) ===');
  console.log('Note: To execute live upstream smoke tests, run:');
  console.log('  npm run test:api:live\n');
}
