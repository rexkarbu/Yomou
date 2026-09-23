import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MeionovelProvider,
  meionovelProvider,
} from '../server/dist/providers/index.js';
import {
  extractNovelSlug,
  extractChapterSlug,
  extractChapterNumber,
  detectBotChallenge,
  isKnownEmptyPage,
  normalizeImageUrl,
  parseLatestFeed,
  parsePopularFeed,
  parseNovelFeed,
} from '../server/dist/utils/parser.js';
import { ProviderError } from '../server/dist/errors/provider.error.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const fixturesDir = path.join(rootDir, 'server', 'test', 'fixtures');

const isLive = process.argv.includes('--live');

console.log('=== [BE-02] Meionovel Scraper Engine & Feed Verification ===');
console.log(`Mode: ${isLive ? 'LIVE SMOKE TEST (against upstream)' : 'OFFLINE FIXTURE TESTS'}\n`);

// ---------------------------------------------------------------------------
// 1. Slug & Chapter Extraction Helper Unit Tests
// ---------------------------------------------------------------------------
console.log('--- 1. Testing Slug & Chapter Extraction Utilities ---');

// Novel slug extraction
assert.strictEqual(
  extractNovelSlug('https://meionovels.com/novel/kimi-wa-boku-no-koukai-ln/'),
  'kimi-wa-boku-no-koukai-ln',
  'Must extract clean novel slug without domain and trailing slash'
);
assert.strictEqual(
  extractNovelSlug('https://meionovels.com/novel/btth'),
  'btth',
  'Must extract clean novel slug without trailing slash'
);
assert.strictEqual(
  extractNovelSlug('/novel/swallowed-star/?m_orderby=views'),
  'swallowed-star',
  'Must extract clean slug ignoring query parameters'
);
assert.strictEqual(
  extractNovelSlug('https://meionovels.com/category/action/'),
  null,
  'Non-novel URL must return null'
);

// Chapter slug extraction
assert.strictEqual(
  extractChapterSlug('https://meionovels.com/novel/btth/mtl/chapter-1648-tamat/', 'btth'),
  'mtl/chapter-1648-tamat',
  'Must preserve subpath like mtl/ in chapter slug'
);
assert.strictEqual(
  extractChapterSlug('https://meionovels.com/novel/kimi-wa-boku-no-koukai-ln/volume-4-chapter-14/'),
  'volume-4-chapter-14',
  'Must extract volume and chapter slug'
);

// Chapter number extraction
assert.strictEqual(extractChapterNumber('Chapter 1001'), 1001);
assert.strictEqual(extractChapterNumber('Chapter 1648 Tamat'), 1648);
assert.strictEqual(extractChapterNumber('Volume 4 Chapter 14'), 14);
assert.strictEqual(extractChapterNumber('Bab 25.5'), 25.5);
assert.strictEqual(extractChapterNumber('Prolog'), undefined);

console.log('✔ Helper extraction utilities strictly verified\n');

// ---------------------------------------------------------------------------
// 2. Cover URL Normalization Unit Tests
// ---------------------------------------------------------------------------
console.log('--- 2. Testing Cover URL Normalization & Protocol Security ---');

assert.strictEqual(
  normalizeImageUrl('images/cover.jpg', 'https://meionovels.com'),
  'https://meionovels.com/images/cover.jpg',
  'Relative URL must resolve to absolute HTTP(S) URL based on baseUrl'
);
assert.strictEqual(
  normalizeImageUrl('/uploads/2023/10/novel.jpg', 'https://meionovels.com'),
  'https://meionovels.com/uploads/2023/10/novel.jpg',
  'Root-relative URL must resolve to absolute URL'
);
assert.strictEqual(
  normalizeImageUrl('//cdn.meionovels.com/cover.jpg', 'https://meionovels.com'),
  'https://cdn.meionovels.com/cover.jpg',
  'Protocol-relative URL must resolve to absolute HTTPS URL'
);
assert.strictEqual(
  normalizeImageUrl('https://meionovels.com/cover.jpg', 'https://meionovels.com'),
  'https://meionovels.com/cover.jpg',
  'Valid HTTPS URL must be preserved'
);
assert.strictEqual(
  normalizeImageUrl('http://meionovels.com/cover.jpg', 'https://meionovels.com'),
  'http://meionovels.com/cover.jpg',
  'Valid HTTP URL must be preserved'
);

// Forbidden protocols & schemes
assert.strictEqual(
  normalizeImageUrl('javascript:alert(1)', 'https://meionovels.com'),
  null,
  'javascript: scheme must be rejected and return null'
);
assert.strictEqual(
  normalizeImageUrl('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'https://meionovels.com'),
  null,
  'data: scheme must be rejected and return null'
);
assert.strictEqual(
  normalizeImageUrl('file:///etc/passwd', 'https://meionovels.com'),
  null,
  'file: scheme must be rejected and return null'
);
assert.strictEqual(
  normalizeImageUrl('vbscript:msgbox(1)', 'https://meionovels.com'),
  null,
  'vbscript: scheme must be rejected and return null'
);

// Empty and unparseable inputs
assert.strictEqual(normalizeImageUrl(''), null, 'Empty string must return null');
assert.strictEqual(normalizeImageUrl('   '), null, 'Whitespace-only string must return null');
assert.strictEqual(normalizeImageUrl(null), null, 'null must return null');
assert.strictEqual(normalizeImageUrl(undefined), null, 'undefined must return null');
assert.strictEqual(normalizeImageUrl('http://[invalid-host'), null, 'Malformed URL must return null');

console.log('✔ Cover URL normalization and scheme validation strictly verified\n');

// ---------------------------------------------------------------------------
// 3. Parser Testing Against Verified Upstream HTML Fixtures
// ---------------------------------------------------------------------------
console.log('--- 3. Testing Feed Parser on Upstream HTML Fixtures ---');

const homeHtml = fs.readFileSync(path.join(fixturesDir, 'home-feed.html'), 'utf8');
const popularHtml = fs.readFileSync(path.join(fixturesDir, 'popular-feed.html'), 'utf8');
const nothingFoundHtml = fs.readFileSync(path.join(fixturesDir, 'nothing-found.html'), 'utf8');
const cfChallengeHtml = fs.readFileSync(path.join(fixturesDir, 'cloudflare-challenge.html'), 'utf8');
const corruptedHtml = fs.readFileSync(path.join(fixturesDir, 'corrupted-empty.html'), 'utf8');

// Edge-case fixtures
const emptyLatestWithPopSidebar = fs.readFileSync(path.join(fixturesDir, 'latest-empty-with-popular-sidebar.html'), 'utf8');
const corruptedLatestWithPopSidebar = fs.readFileSync(path.join(fixturesDir, 'latest-corrupted-with-popular-sidebar.html'), 'utf8');
const brokenLinksContainer = fs.readFileSync(path.join(fixturesDir, 'container-with-broken-links.html'), 'utf8');
const dangerousCoverContainer = fs.readFileSync(path.join(fixturesDir, 'container-with-dangerous-cover.html'), 'utf8');

// 3A. Latest updates feed
const latestItems = parseLatestFeed(homeHtml);
assert(Array.isArray(latestItems), 'Latest items must be an array');
assert(latestItems.length >= 10, `Expected at least 10 items in home feed, got: ${latestItems.length}`);

for (const novel of latestItems) {
  assert(novel.id && typeof novel.id === 'string', `Novel ID must be non-empty string: ${novel.id}`);
  assert(!novel.id.includes('/'), `Novel ID must be pure slug without slashes: ${novel.id}`);
  assert(!novel.id.includes('meionovels.com'), `Novel ID must be clean of domain: ${novel.id}`);
  assert(novel.title && typeof novel.title === 'string', `Novel title must be non-empty string: ${novel.title}`);
  assert(
    novel.coverUrl.startsWith('http://') || novel.coverUrl.startsWith('https://'),
    `Cover URL must be absolute HTTP(S): ${novel.coverUrl}`
  );
  if (novel.latestChapter) {
    assert(novel.latestChapter.id, `Chapter ID must be present: ${novel.id}`);
    assert(novel.latestChapter.title, `Chapter title must be present: ${novel.id}`);
  }
}
console.log(`  Subtest 3A: Successfully parsed ${latestItems.length} latest novels with complete metadata & chapter details`);

// 3B. Popular feed (?m_orderby=views)
const popularItems = parsePopularFeed(popularHtml);
assert(Array.isArray(popularItems), 'Popular items must be an array');
assert(popularItems.length >= 10, `Expected at least 10 items in popular feed, got: ${popularItems.length}`);

const popularSlugs = popularItems.map((n) => n.id);
assert(
  popularSlugs.includes('btth'),
  'Popular feed must include Battle Through the Heavens (btth)'
);
assert(
  popularSlugs.includes('swallowed-star'),
  'Popular feed must include Swallowed Star (swallowed-star)'
);
const btth = popularItems.find((n) => n.id === 'btth');
assert.strictEqual(btth.title, 'Battle Through the Heavens');
assert(btth.coverUrl.includes('16_btth'), 'BTTH cover URL must match asset');
assert.strictEqual(btth.latestChapter?.id, 'mtl/chapter-1648-tamat');
assert.strictEqual(btth.latestChapter?.chapterNumber, 1648);
console.log(`  Subtest 3B: Successfully verified popular novels feed (BTTH, Swallowed Star verified)`);

// 3C. Distinguish legitimate empty page (Nothing Found) from parse failure
assert(isKnownEmptyPage(nothingFoundHtml, 'latest'), 'Must identify Nothing Found markup as known empty page');
const emptyItems = parseLatestFeed(nothingFoundHtml);
assert.deepStrictEqual(emptyItems, [], 'Legitimate empty page must return empty array without error');
console.log('  Subtest 3C: Legitimate empty/out-of-bounds page correctly returned empty array []');

// 3D. Cloudflare challenge detection
assert(detectBotChallenge(cfChallengeHtml), 'Must detect Cloudflare challenge markers');
let cfBlockedErr = null;
try {
  parseLatestFeed(cfChallengeHtml);
} catch (err) {
  cfBlockedErr = err;
}
assert(cfBlockedErr instanceof ProviderError, 'Must throw ProviderError on challenge page');
assert.strictEqual(cfBlockedErr.code, 'PROVIDER_BLOCKED', 'Error code must be PROVIDER_BLOCKED');
assert.strictEqual(cfBlockedErr.status, 503, 'HTTP status must be 503');
console.log('  Subtest 3D: Anti-bot challenge correctly identified and thrown as PROVIDER_BLOCKED (503)');

// 3E. Corrupted markup triggers SCRAPER_PARSE_ERROR
let parseErr = null;
try {
  parseLatestFeed(corruptedHtml);
} catch (err) {
  parseErr = err;
}
assert(parseErr instanceof ProviderError, 'Must throw ProviderError on corrupted markup');
assert.strictEqual(parseErr.code, 'SCRAPER_PARSE_ERROR', 'Error code must be SCRAPER_PARSE_ERROR');
assert.strictEqual(parseErr.status, 500, 'HTTP status must be 500');
console.log('  Subtest 3E: Corrupted layout correctly identified and thrown as SCRAPER_PARSE_ERROR (500)\n');

// ---------------------------------------------------------------------------
// 4. Edge Cases: Isolation of Latest Feed vs Popular Sidebar
// ---------------------------------------------------------------------------
console.log('--- 4. Testing Edge Cases (Feed Context Isolation & Malformed Items) ---');

// Edge Case 4A: Latest kosong + sidebar populer -> must remain empty [], NOT return popular sidebar items
const emptyLatestResult = parseLatestFeed(emptyLatestWithPopSidebar);
assert.deepStrictEqual(
  emptyLatestResult,
  [],
  'Latest feed on empty page with popular sidebar present must return [], not sidebar items'
);
// Meanwhile, parsePopularFeed on the same page CAN use the sidebar fallback
const popularFallbackResult = parsePopularFeed(emptyLatestWithPopSidebar);
assert(
  popularFallbackResult.length > 0 && popularFallbackResult[0].id === 'btth',
  'Popular parser should use sidebar fallback when called for popular feed'
);
console.log('  Subtest 4A: Latest empty + popular sidebar -> returned [] (popular sidebar NOT leaked into latest)');

// Edge Case 4B: Latest rusak + sidebar populer -> must throw SCRAPER_PARSE_ERROR, NOT return popular sidebar items
let corruptedWithSidebarErr = null;
try {
  parseLatestFeed(corruptedLatestWithPopSidebar);
} catch (err) {
  corruptedWithSidebarErr = err;
}
assert(corruptedWithSidebarErr instanceof ProviderError, 'Must throw ProviderError on corrupted latest with sidebar');
assert.strictEqual(corruptedWithSidebarErr.code, 'SCRAPER_PARSE_ERROR', 'Must throw SCRAPER_PARSE_ERROR');
assert.strictEqual(corruptedWithSidebarErr.status, 500);
console.log('  Subtest 4B: Latest corrupted + popular sidebar -> threw SCRAPER_PARSE_ERROR (500), not popular fallback');

// Edge Case 4C: Container exists but all novel links are broken (non-novel URLs) -> must throw SCRAPER_PARSE_ERROR
let brokenLinksErr = null;
try {
  parseLatestFeed(brokenLinksContainer);
} catch (err) {
  brokenLinksErr = err;
}
assert(brokenLinksErr instanceof ProviderError, 'Must throw ProviderError when container has only broken links');
assert.strictEqual(brokenLinksErr.code, 'SCRAPER_PARSE_ERROR', 'Must throw SCRAPER_PARSE_ERROR');
assert.strictEqual(brokenLinksErr.status, 500);
console.log('  Subtest 4C: Container present with broken links -> threw SCRAPER_PARSE_ERROR (500)');

// Edge Case 4D: Container exists but all items have dangerous/invalid covers -> must throw SCRAPER_PARSE_ERROR
let dangerousCoverErr = null;
try {
  parseLatestFeed(dangerousCoverContainer);
} catch (err) {
  dangerousCoverErr = err;
}
assert(dangerousCoverErr instanceof ProviderError, 'Must throw ProviderError when container has only dangerous covers');
assert.strictEqual(dangerousCoverErr.code, 'SCRAPER_PARSE_ERROR', 'Must throw SCRAPER_PARSE_ERROR');
assert.strictEqual(dangerousCoverErr.status, 500);
console.log('  Subtest 4D: Container present with dangerous covers -> threw SCRAPER_PARSE_ERROR (500)\n');

// ---------------------------------------------------------------------------
// 5. Provider Contract & Boundary Tests
// ---------------------------------------------------------------------------
console.log('--- 5. Testing Provider Contract & Unimplemented Boundaries ---');

assert.strictEqual(meionovelProvider.name, 'meionovel');
assert.strictEqual(meionovelProvider.baseUrl, 'https://meionovels.com');

// Note: search(), getNovelDetails(), and getChapterContent() are now implemented (BE-02..BE-04).
assert.strictEqual(typeof meionovelProvider.getChapterContent, 'function', 'getChapterContent must be implemented');

// Test getChapterContent() input validation rejects invalid slug
let chapterErr = null;
try {
  await meionovelProvider.getChapterContent('btth', '../invalid-traversal');
} catch (err) {
  chapterErr = err;
}
assert(chapterErr instanceof ProviderError);
assert.strictEqual(chapterErr.status, 400, 'getChapterContent() must reject invalid slug with 400 BAD_REQUEST');

console.log('✔ Provider methods strictly implemented and input validation verified\n');

// ---------------------------------------------------------------------------
// 6. Live Smoke Testing (Only run if --live flag is passed)
// ---------------------------------------------------------------------------
if (!isLive) {
  console.log('=== OFFLINE FIXTURE VERIFICATION COMPLETED (ALL PASSED) ===');
  console.log('Note: To execute live upstream smoke test, run:');
  console.log('  npm run test:provider-feeds:live\n');
  process.exit(0);
}

console.log('--- 6. Live Smoke Testing on Upstream (meionovels.com) ---');

let liveLatest;
let liveTrending;
let livePage2;

try {
  console.log('Fetching live getLatest(1)...');
  liveLatest = await meionovelProvider.getLatest(1);
  assert(
    Array.isArray(liveLatest) && liveLatest.length > 0,
    'Live getLatest(1) must return non-empty array'
  );
  console.log(`✔ Live getLatest(1) succeeded: ${liveLatest.length} novels retrieved.`);
  console.log(`  Sample: "${liveLatest[0].title}" (slug: ${liveLatest[0].id})`);
} catch (err) {
  console.error(`✖ Live getLatest(1) failed: [${err.code || 'UNKNOWN'}] ${err.message}`);
  process.exit(1);
}

try {
  console.log('Fetching live getTrending()...');
  liveTrending = await meionovelProvider.getTrending();
  assert(
    Array.isArray(liveTrending) && liveTrending.length > 0,
    'Live getTrending must return non-empty array'
  );
  console.log(`✔ Live getTrending() succeeded: ${liveTrending.length} novels retrieved.`);
  const sampleTrending = liveTrending.find((n) => n.id === 'btth') || liveTrending[0];
  console.log(`  Sample: "${sampleTrending.title}" (slug: ${sampleTrending.id})`);
} catch (err) {
  console.error(`✖ Live getTrending() failed: [${err.code || 'UNKNOWN'}] ${err.message}`);
  process.exit(1);
}

try {
  console.log('Fetching live getLatest(2) (Pagination)...');
  livePage2 = await meionovelProvider.getLatest(2);
  assert(
    Array.isArray(livePage2) && livePage2.length > 0,
    'Live getLatest(2) must return non-empty array'
  );
  console.log(`✔ Live getLatest(2) succeeded: ${livePage2.length} novels retrieved.`);

  // Verify that page 2 actually retrieved page 2 content, not page 1 or popular sidebar
  const page1Ids = new Set(liveLatest.map((n) => n.id));
  const trendingIds = new Set(liveTrending.map((n) => n.id));

  const page2HasNewItems = livePage2.some((item) => !page1Ids.has(item.id));
  assert(
    page2HasNewItems,
    'Page 2 must contain novel items distinct from Page 1 (genuine pagination verification)'
  );

  const page2DistinctFromTrending = livePage2.some((item) => !trendingIds.has(item.id));
  assert(
    page2DistinctFromTrending,
    'Page 2 must contain novel items distinct from Trending sidebar (not falling back to popular)'
  );

  console.log('✔ Pagination check verified: Page 2 content is distinct from Page 1 and Trending list.');
} catch (err) {
  console.error(`✖ Live pagination verification failed: [${err.code || 'UNKNOWN'}] ${err.message}`);
  process.exit(1);
}

console.log('\n--- Live Smoke Test Results Summary ---');
console.log('✔ Latest Updates (Page 1): PASSED (200 OK)');
console.log('✔ Popular / Trending:     PASSED (200 OK)');
console.log('✔ Pagination (Page 2):     PASSED (200 OK, verified distinct items)');
console.log('\n=== ALL BE-02 LIVE & OFFLINE VERIFICATIONS PASSED ===\n');
process.exit(0);
