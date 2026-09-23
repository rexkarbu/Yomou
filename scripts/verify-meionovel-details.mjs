import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

// Direct import from provider module to avoid starting HTTP server (Correction 7)
import {
  MeionovelProvider,
  meionovelProvider,
} from '../server/dist/providers/index.js';
import {
  hasPathTraversal,
  validateNovelSlug,
  extractNovelSlug,
  extractChapterSlug,
  extractChapterNumber,
  detectBotChallenge,
  parseSearchFeed,
  parseNovelMetadata,
  parseNovelChapters,
} from '../server/dist/utils/parser.js';
import { ResilientHttpClient } from '../server/dist/services/httpClient.js';
import { ProviderError } from '../server/dist/errors/provider.error.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const fixturesDir = path.join(rootDir, 'server', 'test', 'fixtures');

const isLive = process.argv.includes('--live');

console.log('=== [BE-03] Meionovel Search & Novel Details Scraper Verification ===');
console.log(`Mode: ${isLive ? 'LIVE SMOKE TEST (against meionovels.com)' : 'OFFLINE FIXTURE & UNIT TESTS'}\n`);

// ---------------------------------------------------------------------------
// 1. Novel ID & Traversal Validation Unit Tests (Correction 4)
// ---------------------------------------------------------------------------
console.log('--- 1. Testing Novel ID Validation & Traversal Guards ---');

assert.strictEqual(validateNovelSlug('kimi-wa-boku-no-koukai-ln'), 'kimi-wa-boku-no-koukai-ln');
assert.strictEqual(validateNovelSlug('btth'), 'btth');
assert.strictEqual(validateNovelSlug('swallowed_star'), 'swallowed_star');

const invalidSlugs = [
  '',
  '   ',
  '../etc/passwd',
  '../../novel',
  'novel/subpath',
  'novel\\subpath',
  'http://evil.com',
  'javascript:alert(1)',
  'novel\0nullbyte',
  'novel with spaces',
];

for (const badSlug of invalidSlugs) {
  assert.throws(
    () => validateNovelSlug(badSlug),
    (err) => err instanceof ProviderError && err.code === 'BAD_REQUEST' && err.status === 400,
    `Must throw BAD_REQUEST (400) for invalid slug: "${badSlug}"`
  );
}

// Traversal detection and no basename fallback verification
assert.strictEqual(hasPathTraversal('..'), true);
assert.strictEqual(hasPathTraversal('../chapter-1'), true);
assert.strictEqual(hasPathTraversal('/novel/btth/mtl/../chapter-1/'), true);
assert.strictEqual(hasPathTraversal('/novel/btth/mtl/%2e%2e/chapter-1/'), true);
assert.strictEqual(hasPathTraversal('/novel/btth/mtl/%2E%2E/chapter-1/'), true);
assert.strictEqual(hasPathTraversal('/novel/btth/mtl/chapter-1/'), false);

// extractChapterSlug must NOT rescue invalid URLs using basename fallback
assert.strictEqual(extractChapterSlug('/novel/btth/mtl/../chapter-1/', 'btth'), '', 'Must not rescue literal traversal with basename');
assert.strictEqual(extractChapterSlug('/novel/btth/mtl/%2e%2e/chapter-1/', 'btth'), '', 'Must not rescue percent-encoded traversal with basename');
assert.strictEqual(extractChapterSlug('/novel/other-novel/chapter-1/', 'btth'), '', 'Must not rescue foreign novel with basename');
assert.strictEqual(extractChapterSlug('invalid-path-without-novel', 'btth'), '', 'Must not rescue arbitrary string with basename');
assert.strictEqual(extractChapterSlug('https://meionovels.com/novel/btth/mtl/chapter-1648-tamat/', 'btth'), 'mtl/chapter-1648-tamat');

console.log('✔ Novel ID & traversal validation strictly guards against path traversal, schemes, and malformed input\n');

// ---------------------------------------------------------------------------
// 2. Offline Search Parser Unit Tests
// ---------------------------------------------------------------------------
console.log('--- 2. Testing Search Parser on HTML Fixtures ---');

const searchKimiHtml = fs.readFileSync(path.join(fixturesDir, 'search-kimi.html'), 'utf8');
const searchEmptyHtml = fs.readFileSync(path.join(fixturesDir, 'search-empty.html'), 'utf8');
const searchCorruptedHtml = fs.readFileSync(path.join(fixturesDir, 'search-corrupted.html'), 'utf8');
const cfChallengeHtml = fs.readFileSync(path.join(fixturesDir, 'cloudflare-challenge.html'), 'utf8');

// 2A. Search results with items
const searchResults = parseSearchFeed(searchKimiHtml);
assert(Array.isArray(searchResults), 'Search results must be an array');
assert(searchResults.length >= 10, `Expected at least 10 search results, got ${searchResults.length}`);

const kimiResult = searchResults.find((n) => n.id === 'kimi-wa-boku-no-koukai-ln');
assert(kimiResult, 'Search results must include Kimi wa Boku no Koukai LN');
assert.strictEqual(kimiResult.title, 'Kimi wa Boku no Koukai LN');
assert.strictEqual(kimiResult.author, 'Shimesaba');
assert.strictEqual(kimiResult.status, 'Ongoing');
assert(Array.isArray(kimiResult.genres) && kimiResult.genres.includes('Romance'));
assert(kimiResult.coverUrl.startsWith('http://') || kimiResult.coverUrl.startsWith('https://'));
assert.strictEqual(kimiResult.latestChapter?.id, 'volume-4-chapter-14');
assert.strictEqual(kimiResult.latestChapter?.chapterNumber, 14);
console.log(`  Subtest 2A: Successfully parsed ${searchResults.length} search results with complete metadata`);

// 2B. Legitimate empty search results
const emptySearchResults = parseSearchFeed(searchEmptyHtml);
assert.deepStrictEqual(emptySearchResults, [], 'Empty search results must return [] without error');
console.log('  Subtest 2B: Empty search results (No matches found) correctly returned []');

// 2C. Corrupted search results
assert.throws(
  () => parseSearchFeed(searchCorruptedHtml),
  (err) => err instanceof ProviderError && err.code === 'SCRAPER_PARSE_ERROR' && err.status === 500,
  'Corrupted search results must throw SCRAPER_PARSE_ERROR (500)'
);
console.log('  Subtest 2C: Corrupted search markup correctly threw SCRAPER_PARSE_ERROR (500)');

// 2D. Cloudflare challenge on search
assert.throws(
  () => parseSearchFeed(cfChallengeHtml),
  (err) => err instanceof ProviderError && err.code === 'PROVIDER_BLOCKED' && err.status === 503,
  'Cloudflare challenge on search must throw PROVIDER_BLOCKED (503)'
);
console.log('  Subtest 2D: Anti-bot challenge on search correctly threw PROVIDER_BLOCKED (503)');

// 2E. Search page with sidebar containing .no-results widget (must not return empty [])
const searchWithSidebarNoResultsHtml = `
<div class="site-content">
  <div class="c-page__content">
    <div class="tab-content-wrap">
      <div role="tabpanel" class="c-tabs-item">
        <div id="loop-content" class="page-content-listing">
          <div class="row c-tabs-item__content">
            <div class="col-4 col-md-2">
              <div class="tab-thumb">
                <a href="https://meionovels.com/novel/kimi-wa-boku-no-koukai-ln/" title="Kimi wa Boku no Koukai LN">
                  <img src="https://meionovels.com/cover.jpg" />
                </a>
              </div>
            </div>
            <div class="col-8 col-md-10">
              <div class="post-title">
                <a href="https://meionovels.com/novel/kimi-wa-boku-no-koukai-ln/">Kimi wa Boku no Koukai LN</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <aside class="sidebar">
    <div class="widget">
      <div class="no-results not-found">No recent posts found</div>
    </div>
  </aside>
</div>`;
const searchSidebarResults = parseSearchFeed(searchWithSidebarNoResultsHtml);
assert.strictEqual(searchSidebarResults.length, 1);
assert.strictEqual(searchSidebarResults[0].id, 'kimi-wa-boku-no-koukai-ln');
console.log('  Subtest 2E: Sidebar .no-results widget correctly ignored during search parsing\n');

// ---------------------------------------------------------------------------
// 3. Offline Novel Metadata Parser Unit Tests
// ---------------------------------------------------------------------------
console.log('--- 3. Testing Novel Metadata Parser on HTML Fixtures ---');

const detailKimiHtml = fs.readFileSync(path.join(fixturesDir, 'detail-kimi.html'), 'utf8');
const detailBtthHtml = fs.readFileSync(path.join(fixturesDir, 'detail-btth.html'), 'utf8');
const detail404Html = fs.readFileSync(path.join(fixturesDir, 'detail-404.html'), 'utf8');

// 3A. Kimi metadata
const kimiMeta = parseNovelMetadata(detailKimiHtml, 'kimi-wa-boku-no-koukai-ln');
assert.strictEqual(kimiMeta.id, 'kimi-wa-boku-no-koukai-ln');
assert.strictEqual(kimiMeta.title, 'Kimi wa Boku no Koukai LN');
assert.strictEqual(kimiMeta.author, 'Shimesaba');
assert.strictEqual(kimiMeta.status, 'Ongoing');
assert(Array.isArray(kimiMeta.genres) && kimiMeta.genres.includes('Drama'));
assert(kimiMeta.synopsis && kimiMeta.synopsis.startsWith('Penyesalan Asada Yuzuru.'));
assert(!kimiMeta.synopsis.includes('Summary') && !kimiMeta.synopsis.includes('Show more'));
assert(kimiMeta.coverUrl.startsWith('http://') || kimiMeta.coverUrl.startsWith('https://'));
console.log('  Subtest 3A: Successfully parsed Kimi novel metadata (clean synopsis, author, status)');

// 3B. BTTH metadata
const btthMeta = parseNovelMetadata(detailBtthHtml, 'btth');
assert.strictEqual(btthMeta.id, 'btth');
assert.strictEqual(btthMeta.title, 'Battle Through the Heavens');
assert.strictEqual(btthMeta.author, 'Heavenly Silkworm Potato');
assert.strictEqual(btthMeta.status, 'Completed');
assert(Array.isArray(btthMeta.genres) && btthMeta.genres.includes('Action'));
assert(btthMeta.coverUrl.includes('16_btth'));
console.log('  Subtest 3B: Successfully parsed BTTH novel metadata (Completed status verified)');

// 3C. 404 Not Found detection
assert.throws(
  () => parseNovelMetadata(detail404Html, 'nonexistent-novel'),
  (err) => err instanceof ProviderError && err.code === 'PROVIDER_NOT_FOUND' && err.status === 404,
  '404 HTML must throw PROVIDER_NOT_FOUND (404)'
);
console.log('  Subtest 3C: 404 page correctly detected and thrown as PROVIDER_NOT_FOUND (404)');

// 3D. Detail page with sidebar containing .no-results widget (must not throw 404)
const detailWithSidebarNoResultsHtml = `
<div class="site-content">
  <div class="post-title">
    <h1>Kimi wa Boku no Koukai LN</h1>
  </div>
  <div class="summary_image">
    <img src="https://meionovels.com/cover.jpg" />
  </div>
  <div class="description-summary">
    <div class="summary__content"><p>Sinopsis cerita...</p></div>
  </div>
  <div class="post-content_item"><h5>Status</h5><div class="summary-content">Ongoing</div></div>
  <aside class="sidebar">
    <div class="widget">
      <div class="no-results not-found">No recent updates</div>
    </div>
  </aside>
</div>`;
const detailSidebarMeta = parseNovelMetadata(detailWithSidebarNoResultsHtml, 'kimi-wa-boku-no-koukai-ln');
assert.strictEqual(detailSidebarMeta.title, 'Kimi wa Boku no Koukai LN');
assert.strictEqual(detailSidebarMeta.status, 'Ongoing');
console.log('  Subtest 3D: Sidebar .no-results widget correctly ignored during metadata parsing\n');

// ---------------------------------------------------------------------------
// 4. Offline Chapter List Parser Unit Tests
// ---------------------------------------------------------------------------
console.log('--- 4. Testing Chapter List Parser & Chronological Ordering ---');

const detailKimiChaptersHtml = fs.readFileSync(path.join(fixturesDir, 'detail-kimi-chapters.html'), 'utf8');
const detailBtthChaptersHtml = fs.readFileSync(path.join(fixturesDir, 'detail-btth-chapters-sample.html'), 'utf8');
const detailMultiVolumeHtml = fs.readFileSync(path.join(fixturesDir, 'detail-multi-volume-chapters.html'), 'utf8');
const detailCorruptedChapterHtml = fs.readFileSync(path.join(fixturesDir, 'detail-corrupted-chapter.html'), 'utf8');

// 4A. Snapshot Kimi chapters (exact 63 chapters in snapshot fixture per Correction 6)
const kimiChapters = parseNovelChapters(detailKimiChaptersHtml, 'kimi-wa-boku-no-koukai-ln');
assert.strictEqual(kimiChapters.length, 63, `Expected exact 63 chapters in Kimi snapshot fixture, got ${kimiChapters.length}`);

// Verify chronological order: first chapter must be Volume 1 Chapter 0, last is Volume 4 Chapter 14
assert.strictEqual(kimiChapters[0].id, 'volume-1-chapter-0');
assert.strictEqual(kimiChapters[0].title, 'Volume 1 Chapter 0');
assert.strictEqual(kimiChapters[0].chapterNumber, 0);

assert.strictEqual(kimiChapters[62].id, 'volume-4-chapter-14');
assert.strictEqual(kimiChapters[62].title, 'Volume 4 Chapter 14');
assert.strictEqual(kimiChapters[62].chapterNumber, 14);

// Verify all chapter IDs unique
const kimiIdSet = new Set(kimiChapters.map((c) => c.id));
assert.strictEqual(kimiIdSet.size, 63, 'All 63 chapter IDs must be unique');
console.log('  Subtest 4A: Exact 63 Kimi chapters parsed in true chronological order (Vol 1 Ch 0 -> Vol 4 Ch 14)');

// 4B. Preserving subpaths like 'mtl/' (Correction 3 & 4)
const btthChapters = parseNovelChapters(detailBtthChaptersHtml, 'btth');
assert.strictEqual(btthChapters.length, 3);
assert.strictEqual(btthChapters[0].id, 'mtl/chapter-1');
assert.strictEqual(btthChapters[0].chapterNumber, 1);
assert.strictEqual(btthChapters[1].id, 'mtl/chapter-2');
assert.strictEqual(btthChapters[2].id, 'mtl/chapter-1648-tamat');
assert.strictEqual(btthChapters[2].chapterNumber, 1648);
console.log('  Subtest 4B: Subpath "mtl/" preserved in chapter IDs (mtl/chapter-1 -> mtl/chapter-1648-tamat)');

// 4C. Multi-volume ordering and prolog fallback (Correction 5)
const multiVolumeChapters = parseNovelChapters(detailMultiVolumeHtml, 'test-novel');
assert.strictEqual(multiVolumeChapters.length, 5);
assert.strictEqual(multiVolumeChapters[0].id, 'prolog');
assert.strictEqual(multiVolumeChapters[0].title, 'Prolog');
assert.strictEqual(multiVolumeChapters[0].chapterNumber, 0); // Prolog fallback to 0

assert.strictEqual(multiVolumeChapters[1].id, 'vol-1-ch-1');
assert.strictEqual(multiVolumeChapters[1].title, 'Volume 1 Chapter 1');
assert.strictEqual(multiVolumeChapters[1].chapterNumber, 1);

assert.strictEqual(multiVolumeChapters[2].id, 'vol-1-ch-2');
assert.strictEqual(multiVolumeChapters[2].title, 'Volume 1 Chapter 2');

assert.strictEqual(multiVolumeChapters[3].id, 'vol-2-ch-1');
assert.strictEqual(multiVolumeChapters[3].title, 'Volume 2 Chapter 1');
assert.strictEqual(multiVolumeChapters[3].chapterNumber, 1); // Repeated chapterNumber 1 across volumes preserved!

assert.strictEqual(multiVolumeChapters[4].id, 'vol-2-ch-2');
assert.strictEqual(multiVolumeChapters[4].title, 'Volume 2 Chapter 2');
console.log('  Subtest 4C: Multi-volume ordering strictly preserved without artificial sorting by chapter number');

// 4D. Corrupted chapter element detection (Correction 6)
assert.throws(
  () => parseNovelChapters(detailCorruptedChapterHtml, 'test-novel'),
  (err) => err instanceof ProviderError && err.code === 'SCRAPER_PARSE_ERROR' && err.status === 500,
  'Corrupted chapter element must throw SCRAPER_PARSE_ERROR (500), not silently dropped'
);
console.log('  Subtest 4D: Corrupted chapter element strictly caught and thrown as SCRAPER_PARSE_ERROR (500)');

// 4E. Cross-origin and novel mismatch rejection (Correction 4)
const crossOriginHtml = `
<ul class="main version-chap">
  <li class="wp-manga-chapter"><a href="https://evil.com/novel/test-novel/ch-1/">Chapter 1</a></li>
</ul>`;
assert.throws(
  () => parseNovelChapters(crossOriginHtml, 'test-novel'),
  (err) => err instanceof ProviderError && err.code === 'SCRAPER_PARSE_ERROR' && err.status === 500,
  'Cross-origin chapter URL must be rejected'
);

const mismatchNovelHtml = `
<ul class="main version-chap">
  <li class="wp-manga-chapter"><a href="https://meionovels.com/novel/other-novel/ch-1/">Chapter 1</a></li>
</ul>`;
assert.throws(
  () => parseNovelChapters(mismatchNovelHtml, 'test-novel'),
  (err) => err instanceof ProviderError && err.code === 'SCRAPER_PARSE_ERROR' && err.status === 500,
  'Chapter URL belonging to another novel must be rejected'
);
console.log('  Subtest 4E: Cross-origin and foreign novel URLs strictly rejected');

// 4F. Regression: [Epilog, Chapter 2, Chapter 1] reversed to [Chapter 1, Chapter 2, Epilog]
const epilogHtml = `
<ul class="main version-chap">
  <li class="wp-manga-chapter"><a href="https://meionovels.com/novel/test-novel/epilog/">Epilog</a></li>
  <li class="wp-manga-chapter"><a href="https://meionovels.com/novel/test-novel/chapter-2/">Chapter 2</a></li>
  <li class="wp-manga-chapter"><a href="https://meionovels.com/novel/test-novel/chapter-1/">Chapter 1</a></li>
</ul>`;
const epilogChapters = parseNovelChapters(epilogHtml, 'test-novel');
assert.strictEqual(epilogChapters.length, 3);
assert.strictEqual(epilogChapters[0].id, 'chapter-1');
assert.strictEqual(epilogChapters[0].title, 'Chapter 1');
assert.strictEqual(epilogChapters[0].chapterNumber, 1);
assert.strictEqual(epilogChapters[1].id, 'chapter-2');
assert.strictEqual(epilogChapters[1].title, 'Chapter 2');
assert.strictEqual(epilogChapters[1].chapterNumber, 2);
assert.strictEqual(epilogChapters[2].id, 'epilog');
assert.strictEqual(epilogChapters[2].title, 'Epilog');
console.log('  Subtest 4F: Regression [Epilog, Chapter 2, Chapter 1] consistently reversed to [Chapter 1, Chapter 2, Epilog]');

// 4G. Literal & percent-encoded traversal in chapter URLs rejected
const literalTraversalHtml = `
<ul class="main version-chap">
  <li class="wp-manga-chapter"><a href="https://meionovels.com/novel/test-novel/mtl/../chapter-1/">Chapter 1</a></li>
</ul>`;
assert.throws(
  () => parseNovelChapters(literalTraversalHtml, 'test-novel'),
  (err) => err instanceof ProviderError && err.code === 'SCRAPER_PARSE_ERROR' && err.status === 500,
  'Literal traversal in chapter URL must be rejected'
);

const encodedTraversalHtml1 = `
<ul class="main version-chap">
  <li class="wp-manga-chapter"><a href="https://meionovels.com/novel/test-novel/mtl/%2e%2e/chapter-1/">Chapter 1</a></li>
</ul>`;
assert.throws(
  () => parseNovelChapters(encodedTraversalHtml1, 'test-novel'),
  (err) => err instanceof ProviderError && err.code === 'SCRAPER_PARSE_ERROR' && err.status === 500,
  'Percent-encoded (%2e%2e) traversal in chapter URL must be rejected'
);

const encodedTraversalHtml2 = `
<ul class="main version-chap">
  <li class="wp-manga-chapter"><a href="https://meionovels.com/novel/test-novel/mtl/%2E%2E/chapter-1/">Chapter 1</a></li>
</ul>`;
assert.throws(
  () => parseNovelChapters(encodedTraversalHtml2, 'test-novel'),
  (err) => err instanceof ProviderError && err.code === 'SCRAPER_PARSE_ERROR' && err.status === 500,
  'Percent-encoded (%2E%2E) traversal in chapter URL must be rejected'
);
console.log('  Subtest 4G: Literal (..) and percent-encoded (%2e%2e, %2E%2E) traversals strictly rejected');

// 4H. Corrupted chapter container vs verified legitimate empty marker
const corruptedContainerHtml = `
<ul class="main version-chap">
</ul>`;
assert.throws(
  () => parseNovelChapters(corruptedContainerHtml, 'test-novel'),
  (err) => err instanceof ProviderError && err.code === 'SCRAPER_PARSE_ERROR' && err.status === 500,
  'Corrupted/unloaded chapter container without verified empty marker must throw SCRAPER_PARSE_ERROR (500)'
);

const legitimateEmptyHtml = `
<ul class="main version-chap">
  <li class="no-chapter">Belum ada chapter</li>
</ul>`;
const emptyChapters = parseNovelChapters(legitimateEmptyHtml, 'test-novel');
assert.deepStrictEqual(emptyChapters, []);
console.log('  Subtest 4H: Corrupted chapter container throws 500; verified empty marker returns []\n');

// ---------------------------------------------------------------------------
// 5. Combined 8-Second Total Deadline Mock Server Test (Correction 2)
// ---------------------------------------------------------------------------
console.log('--- 5. Testing Combined 8-Second Total Deadline on Mock Server ---');

let mockBaseUrl = '';
const mockServer = http.createServer((req, res) => {
  const url = req.url || '';

  if (url === '/novel/fast-novel/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(
      detailKimiHtml
        .replace(/https:\/\/meionovels\.com/g, mockBaseUrl)
        .replace(/kimi-wa-boku-no-koukai-ln/g, 'fast-novel')
    );
    return;
  }

  if (url === '/novel/fast-novel/ajax/chapters/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(
      detailKimiChaptersHtml
        .replace(/https:\/\/meionovels\.com/g, mockBaseUrl)
        .replace(/kimi-wa-boku-no-koukai-ln/g, 'fast-novel')
    );
    return;
  }

  // Hung chapter request (metadata fast, chapter hangs)
  if (url === '/novel/hung-chapter/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(
      detailKimiHtml
        .replace(/https:\/\/meionovels\.com/g, mockBaseUrl)
        .replace(/kimi-wa-boku-no-koukai-ln/g, 'hung-chapter')
    );
    return;
  }
  if (url === '/novel/hung-chapter/ajax/chapters/') {
    // Deliberately do not answer to test remaining deadline abort
    return;
  }

  // Slow metadata request (> total deadline)
  if (url === '/novel/hung-meta/') {
    // Deliberately do not answer
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/html' });
  res.end('<h1>404 Not Found</h1>');
});

await new Promise((resolve) => mockServer.listen(0, '127.0.0.1', resolve));
const mockPort = mockServer.address().port;
mockBaseUrl = `http://127.0.0.1:${mockPort}`;

const testClient = new ResilientHttpClient({
  perAttemptTimeoutMs: 500,
  totalTimeoutMs: 1000,
});
const mockProvider = new MeionovelProvider(mockBaseUrl, testClient);

// 5A. Success case: both metadata and AJAX chapters complete within deadline
const fastDetail = await mockProvider.getNovelDetails('fast-novel', { totalTimeoutMs: 1000 });
assert.strictEqual(fastDetail.title, 'Kimi wa Boku no Koukai LN');
assert.strictEqual(fastDetail.chapters.length, 63);
console.log('  Subtest 5A: Combined metadata + AJAX chapters succeeded within budget');

// 5B. Hung chapter request: second request aborted when remaining time expires
const t0 = Date.now();
let hungChapterErr = null;
try {
  await mockProvider.getNovelDetails('hung-chapter', { totalTimeoutMs: 250 });
} catch (err) {
  hungChapterErr = err;
}
const elapsedHungChap = Date.now() - t0;
assert(hungChapterErr instanceof ProviderError, 'Must throw ProviderError when chapters hang');
assert.strictEqual(hungChapterErr.code, 'PROVIDER_TIMEOUT');
assert.strictEqual(hungChapterErr.status, 504);
assert(elapsedHungChap >= 200 && elapsedHungChap <= 450, `Elapsed should be around 250ms, got ${elapsedHungChap}ms`);
console.log(`  Subtest 5B: Chapter request aborted strictly at remaining deadline (elapsed: ${elapsedHungChap}ms)`);

// 5C. Hung metadata request: aborted at total deadline before second request even starts
const t1 = Date.now();
let hungMetaErr = null;
try {
  await mockProvider.getNovelDetails('hung-meta', { totalTimeoutMs: 200 });
} catch (err) {
  hungMetaErr = err;
}
const elapsedHungMeta = Date.now() - t1;
assert(hungMetaErr instanceof ProviderError, 'Must throw ProviderError when metadata hangs');
assert.strictEqual(hungMetaErr.code, 'PROVIDER_TIMEOUT');
assert.strictEqual(hungMetaErr.status, 504);
assert(elapsedHungMeta >= 170 && elapsedHungMeta <= 400, `Elapsed should be around 200ms, got ${elapsedHungMeta}ms`);
console.log(`  Subtest 5C: Metadata request aborted at total deadline without starting chapter request (elapsed: ${elapsedHungMeta}ms)\n`);

await new Promise((resolve) => mockServer.close(resolve));

// ---------------------------------------------------------------------------
// 6. Provider Contract & Boundary Checks
// ---------------------------------------------------------------------------
console.log('--- 6. Testing Provider Contract & Unimplemented Boundaries ---');

assert.strictEqual(meionovelProvider.name, 'meionovel');
assert.strictEqual(meionovelProvider.baseUrl, 'https://meionovels.com');

// getChapterContent() is now implemented in BE-04
assert.strictEqual(typeof meionovelProvider.getChapterContent, 'function', 'getChapterContent must be implemented');

let chapterContentErr = null;
try {
  await meionovelProvider.getChapterContent('kimi-wa-boku-no-koukai-ln', '../volume-1-chapter-1');
} catch (err) {
  chapterContentErr = err;
}
assert(chapterContentErr instanceof ProviderError);
assert.strictEqual(chapterContentErr.status, 400, 'getChapterContent() must reject invalid slug with 400 BAD_REQUEST');
console.log('✔ getChapterContent() implemented and input validation verified\n');

// ---------------------------------------------------------------------------
// 7. Live Smoke Testing (Only run if --live flag is passed)
// ---------------------------------------------------------------------------
if (!isLive) {
  console.log('=== OFFLINE FIXTURE VERIFICATION COMPLETED (ALL PASSED) ===');
  console.log('Note: To execute live upstream smoke test, run:');
  console.log('  npm run test:provider-details:live\n');
  process.exit(0);
}

console.log('--- 7. Live Smoke Testing on Upstream (meionovels.com) ---');

// 7A. Live search test
try {
  console.log('Executing live search("kimi")...');
  const liveSearchResults = await meionovelProvider.search('kimi');
  assert(Array.isArray(liveSearchResults) && liveSearchResults.length > 0, 'Live search("kimi") must return non-empty array');
  console.log(`✔ Live search("kimi") succeeded: ${liveSearchResults.length} novels retrieved.`);
  console.log(`  Sample: "${liveSearchResults[0].title}" (author: ${liveSearchResults[0].author}, status: ${liveSearchResults[0].status})`);
} catch (err) {
  console.error(`✖ Live search("kimi") failed: [${err.code || 'UNKNOWN'}] ${err.message}`);
  process.exit(1);
}

// 7B. Live novel details test (Kimi)
try {
  console.log('Executing live getNovelDetails("kimi-wa-boku-no-koukai-ln")...');
  const liveKimi = await meionovelProvider.getNovelDetails('kimi-wa-boku-no-koukai-ln');
  assert.strictEqual(liveKimi.id, 'kimi-wa-boku-no-koukai-ln');
  assert.strictEqual(liveKimi.title, 'Kimi wa Boku no Koukai LN');
  assert(liveKimi.author, 'Author must be present');
  assert(liveKimi.coverUrl.startsWith('http'), 'Cover URL must be absolute');
  assert(Array.isArray(liveKimi.chapters) && liveKimi.chapters.length >= 63, `Expected at least 63 chapters, got ${liveKimi.chapters.length}`);

  // Check unique IDs (Correction 6)
  const idSet = new Set(liveKimi.chapters.map((c) => c.id));
  assert.strictEqual(idSet.size, liveKimi.chapters.length, 'All chapter IDs must be unique');

  // Verify first and last chapters
  console.log(`✔ Live getNovelDetails("kimi") succeeded: ${liveKimi.chapters.length} chapters retrieved.`);
  console.log(`  First chapter: "${liveKimi.chapters[0].title}" (id: ${liveKimi.chapters[0].id})`);
  console.log(`  Latest chapter: "${liveKimi.chapters[liveKimi.chapters.length - 1].title}" (id: ${liveKimi.chapters[liveKimi.chapters.length - 1].id})`);
} catch (err) {
  console.error(`✖ Live getNovelDetails("kimi") failed: [${err.code || 'UNKNOWN'}] ${err.message}`);
  process.exit(1);
}

// 7C. Live novel details test (BTTH - verifying subpath /mtl/ preservation)
try {
  console.log('Executing live getNovelDetails("btth")...');
  const liveBtth = await meionovelProvider.getNovelDetails('btth');
  assert.strictEqual(liveBtth.id, 'btth');
  assert.strictEqual(liveBtth.title, 'Battle Through the Heavens');
  assert.strictEqual(liveBtth.status, 'Completed');
  assert(Array.isArray(liveBtth.chapters) && liveBtth.chapters.length >= 1648, `Expected at least 1648 chapters, got ${liveBtth.chapters.length}`);

  // Check subpath /mtl/ preservation
  assert(liveBtth.chapters[0].id.startsWith('mtl/'), `Chapter 1 ID must preserve mtl/ subpath: ${liveBtth.chapters[0].id}`);
  assert(liveBtth.chapters[liveBtth.chapters.length - 1].id.startsWith('mtl/'), `Latest chapter ID must preserve mtl/ subpath: ${liveBtth.chapters[liveBtth.chapters.length - 1].id}`);

  console.log(`✔ Live getNovelDetails("btth") succeeded: ${liveBtth.chapters.length} chapters retrieved.`);
  console.log(`  First chapter: "${liveBtth.chapters[0].title}" (id: ${liveBtth.chapters[0].id})`);
  console.log(`  Latest chapter: "${liveBtth.chapters[liveBtth.chapters.length - 1].title}" (id: ${liveBtth.chapters[liveBtth.chapters.length - 1].id})`);
} catch (err) {
  console.error(`✖ Live getNovelDetails("btth") failed: [${err.code || 'UNKNOWN'}] ${err.message}`);
  process.exit(1);
}

console.log('\n--- Live Smoke Test Results Summary ---');
console.log('✔ Search ("kimi"):              PASSED (200 OK)');
console.log('✔ Detail & Chapters ("kimi"):  PASSED (200 OK, full metadata & chapters verified)');
console.log('✔ Detail & Chapters ("btth"):  PASSED (200 OK, mtl/ subpath preserved)');
console.log('\n=== ALL BE-03 LIVE & OFFLINE VERIFICATIONS PASSED ===\n');
process.exit(0);
