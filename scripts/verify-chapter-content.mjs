import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

import {
  MeionovelProvider,
  meionovelProvider,
} from '../server/dist/providers/index.js';
import {
  validateChapterSlug,
  validateNovelSlug,
  extractChapterSlug,
  extractChapterNumber,
  detectBotChallenge,
  extractChapterContent,
  normalizeSpans,
} from '../server/dist/utils/parser.js';
import { ResilientHttpClient } from '../server/dist/services/httpClient.js';
import { ProviderError } from '../server/dist/errors/provider.error.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const fixturesDir = path.join(rootDir, 'server', 'test', 'fixtures');

const isLive = process.argv.includes('--live');

console.log('=== [BE-04] Chapter Content Sanitizer & ContentBlock[] Verification ===');
console.log(`Mode: ${isLive ? 'LIVE UPSTREAM SMOKE TESTS' : 'OFFLINE FIXTURE & UNIT TESTS'}\n`);

// ---------------------------------------------------------------------------
// 1. Canonical chapterId Validation & Traversal Guards (Correction 4)
// ---------------------------------------------------------------------------
console.log('--- 1. Testing Canonical chapterId Validation & Traversal Guards ---');

// 1A. Valid canonical slugs
assert.strictEqual(validateChapterSlug('volume-1-chapter-1'), 'volume-1-chapter-1');
assert.strictEqual(validateChapterSlug('chapter-100'), 'chapter-100');
assert.strictEqual(validateChapterSlug('mtl/chapter-1648-tamat'), 'mtl/chapter-1648-tamat');
assert.strictEqual(validateChapterSlug('vol-1/arc-2/ch-3'), 'vol-1/arc-2/ch-3');

// 1B. Reject non-canonical whitespace
assert.throws(() => validateChapterSlug(' volume-1-chapter-1'), (err) => {
  return err instanceof ProviderError && err.status === 400 && err.message.includes('whitespace');
}, 'Leading whitespace must be rejected');

assert.throws(() => validateChapterSlug('volume-1-chapter-1 '), (err) => {
  return err instanceof ProviderError && err.status === 400 && err.message.includes('whitespace');
}, 'Trailing whitespace must be rejected');

// 1C. Reject non-canonical leading/trailing slashes (Correction 4: do not silently mutate)
assert.throws(() => validateChapterSlug('/volume-1-chapter-1'), (err) => {
  return err instanceof ProviderError && err.status === 400 && err.message.includes('leading or trailing slashes');
}, 'Leading slash must be rejected');

assert.throws(() => validateChapterSlug('volume-1-chapter-1/'), (err) => {
  return err instanceof ProviderError && err.status === 400 && err.message.includes('leading or trailing slashes');
}, 'Trailing slash must be rejected');

assert.throws(() => validateChapterSlug('/mtl/chapter-1/'), (err) => {
  return err instanceof ProviderError && err.status === 400 && err.message.includes('leading or trailing slashes');
}, 'Surrounding slashes must be rejected');

// 1D. Reject empty path segments / consecutive slashes
assert.throws(() => validateChapterSlug('mtl//chapter-1'), (err) => {
  return err instanceof ProviderError && err.status === 400 && err.message.includes('empty path segment');
}, 'Empty path segment must be rejected');

// 1E. Reject directory traversal (literal & percent-encoded)
const invalidTraversals = [
  '..',
  '../ch1',
  'ch1/..',
  'mtl/../ch1',
  '%2e%2e/ch1',
  'mtl/%2e%2e/ch1',
  '%2E%2E/ch1',
  '.%2e',
  '%2e.',
  'mtl\\ch1',
  'http://evil.com/ch1',
  'ch1\0hidden',
];

for (const bad of invalidTraversals) {
  assert.throws(() => validateChapterSlug(bad), (err) => {
    return err instanceof ProviderError && err.status === 400;
  }, `Should reject invalid/traversal chapterId: ${bad}`);
}

console.log('✔ chapterId canonical validation strictly guards identity without mutating input\n');

// ---------------------------------------------------------------------------
// 2. Real Chapter Extraction (Kimi wa Boku no Koukai LN Vol 1 Ch 1)
// ---------------------------------------------------------------------------
console.log('--- 2. Testing Real Chapter Extraction (Kimi Vol 1 Ch 1) ---');

const kimiHtml = fs.readFileSync(path.join(fixturesDir, 'chapter-kimi-vol1-ch1.html'), 'utf8');
const kimiResult = extractChapterContent(kimiHtml, {
  novelId: 'kimi-wa-boku-no-koukai-ln',
  chapterId: 'volume-1-chapter-1',
  baseUrl: 'https://meionovels.com',
  chapterPageUrl: 'https://meionovels.com/novel/kimi-wa-boku-no-koukai-ln/volume-1-chapter-1/',
});

assert.strictEqual(kimiResult.id, 'volume-1-chapter-1');
assert.strictEqual(kimiResult.novelId, 'kimi-wa-boku-no-koukai-ln');
assert.strictEqual(kimiResult.title, 'Volume 1 Chapter 1');
assert.strictEqual(kimiResult.chapterNumber, 1);
assert.strictEqual(kimiResult.prevChapterId, 'volume-1-chapter-0');
assert.strictEqual(kimiResult.nextChapterId, 'volume-1-chapter-2');

// Verify blocks count and first block is illustration
assert(kimiResult.blocks.length >= 50, `Expected >= 50 blocks, got ${kimiResult.blocks.length}`);
assert.strictEqual(kimiResult.blocks[0].type, 'image', 'First block in Kimi Ch 1 must be ImageBlock');
assert.strictEqual(kimiResult.images.length, 2, 'Kimi Ch 1 contains exactly 2 illustrations');

// Verify 1:1 ImageBlock.id <-> ChapterImage.imageId consistency
const img01Block = kimiResult.blocks.find((b) => b.type === 'image' && b.id === 'img_01');
const img01Item = kimiResult.images.find((img) => img.imageId === 'img_01');
assert(img01Block, 'ImageBlock img_01 must exist');
assert(img01Item, 'ChapterImage img_01 must exist');
assert(img01Item.remoteUrl.startsWith('https://blogger.googleusercontent.com'), 'Remote URL must match');

console.log(`✔ Real Kimi chapter parsed successfully (${kimiResult.blocks.length} blocks, 2 images, valid prev/next)\n`);

// ---------------------------------------------------------------------------
// 3. Subpath Chapter Extraction (BTTH MTL Chapter 1)
// ---------------------------------------------------------------------------
console.log('--- 3. Testing Subpath Chapter Extraction (BTTH MTL Ch 1) ---');

const btthHtml = fs.readFileSync(path.join(fixturesDir, 'chapter-btth-mtl-ch1.html'), 'utf8');
const btthResult = extractChapterContent(btthHtml, {
  novelId: 'btth',
  chapterId: 'mtl/chapter-1',
  baseUrl: 'https://meionovels.com',
  chapterPageUrl: 'https://meionovels.com/novel/btth/mtl/chapter-1/',
});

assert.strictEqual(btthResult.id, 'mtl/chapter-1');
assert.strictEqual(btthResult.novelId, 'btth');
assert.strictEqual(btthResult.chapterNumber, 1);
assert.strictEqual(btthResult.prevChapterId, null, 'Ch 1 must have null prevChapterId');
assert.strictEqual(btthResult.nextChapterId, 'mtl/chapter-2', 'Next chapter must preserve subpath mtl/');
assert(btthResult.blocks.length >= 50, `Expected >= 50 blocks, got ${btthResult.blocks.length}`);

console.log(`✔ Subpath chapter parsed successfully (${btthResult.blocks.length} blocks, prev=null, next=mtl/chapter-2)\n`);

// ---------------------------------------------------------------------------
// 4. Source DOM Order, Inline Spans & Structure (chapter-dom-order.html)
// ---------------------------------------------------------------------------
console.log('--- 4. Testing Source DOM Order, Inline Spans & Structure ---');

const domOrderHtml = fs.readFileSync(path.join(fixturesDir, 'chapter-dom-order.html'), 'utf8');
const domResult = extractChapterContent(domOrderHtml, {
  novelId: 'test-novel',
  chapterId: 'chapter-4',
  baseUrl: 'https://meionovels.com',
  chapterPageUrl: 'https://meionovels.com/novel/test-novel/chapter-4/',
});

// Check heading
assert.strictEqual(domResult.blocks[0].type, 'heading');
assert.strictEqual(domResult.blocks[0].level, 2);
assert.strictEqual(domResult.blocks[0].text, 'Bagian Pertama');

// Check <p>Teks Paragraf A <img ...> Teks Paragraf B</p> sequence (Correction 2)
assert.strictEqual(domResult.blocks[1].type, 'paragraph');
assert.strictEqual(domResult.blocks[1].spans[0].text, 'Teks Paragraf A');

assert.strictEqual(domResult.blocks[2].type, 'image');
assert.strictEqual(domResult.blocks[2].id, 'img_01');

assert.strictEqual(domResult.blocks[3].type, 'paragraph');
assert.strictEqual(domResult.blocks[3].spans[0].text, 'Teks Paragraf B');

// Check separator
assert.strictEqual(domResult.blocks[4].type, 'separator');

// Check nested formatting and word spacing
const formattedP = domResult.blocks[5];
assert.strictEqual(formattedP.type, 'paragraph');
const combinedFormattedText = formattedP.spans.map((s) => s.text).join('');
assert(combinedFormattedText.includes('kata tebal, kata miring, dan tebal miring bersarang.'));
const boldSpan = formattedP.spans.find((s) => s.text === 'tebal');
assert(boldSpan?.bold, 'Expected bold: true on "tebal"');
const italicSpan = formattedP.spans.find((s) => s.text === 'miring');
assert(italicSpan?.italic, 'Expected italic: true on "miring"');
const boldItalicSpan = formattedP.spans.find((s) => s.text === 'tebal miring');
assert(boldItalicSpan?.bold && boldItalicSpan?.italic, 'Expected bold & italic on "tebal miring"');

// Check line break inside paragraph
const brP = domResult.blocks[6];
assert.strictEqual(brP.type, 'paragraph');
const brText = brP.spans.map((s) => s.text).join('');
assert(brText.includes('\n'), 'Line break <br> must be preserved as newline');

// Check unwrap story links: story text preserved, not deleted
const linkP = domResult.blocks[7];
assert.strictEqual(linkP.type, 'paragraph');
const linkText = linkP.spans.map((s) => s.text).join('');
assert(linkText.includes('tautan cerita yang aman'), 'Linked story text must be preserved after unwrapping');

// Check removal of donation / promo paragraph
const allText = domResult.blocks
  .filter((b) => b.type === 'paragraph')
  .flatMap((b) => b.spans)
  .map((s) => s.text)
  .join(' ');
assert(!allText.includes('Trakteer'), 'Donation link/box must be removed');
assert(!allText.includes('Iklan Banner'), 'Ad container must be removed');
assert(!allText.includes('Iklan Kode'), 'Code-block must be removed');

// Check direct wrapper text preserved
assert(allText.includes('Teks cerita langsung di dalam wrapper kontainer.'));

console.log('✔ DOM order, nested formatting, line breaks, link unwrapping, and ad removal verified');

// 4B. DOM Traversal Regressions (Review Finding 1)
console.log('--- 4B. Testing Specific DOM Traversal Regressions ---');

// a. <div><p>A</p><h2>B</h2><hr><p>C</p></div> -> P(A) -> H2(B) -> Separator -> P(C)
const regression1Html = `
<div class="reading-content">
  <div>
    <p>A</p>
    <h2>B</h2>
    <hr>
    <p>C</p>
  </div>
</div>`;
const res1 = extractChapterContent(regression1Html, {
  novelId: 'test-novel',
  chapterId: 'chapter-reg-1',
  baseUrl: 'https://meionovels.com',
  chapterPageUrl: 'https://meionovels.com/novel/test-novel/chapter-reg-1/',
});
assert.strictEqual(res1.blocks.length, 4);
assert.strictEqual(res1.blocks[0].type, 'paragraph');
assert.strictEqual(res1.blocks[0].spans[0].text, 'A');
assert.strictEqual(res1.blocks[1].type, 'heading');
assert.strictEqual(res1.blocks[1].level, 2);
assert.strictEqual(res1.blocks[1].text, 'B');
assert.strictEqual(res1.blocks[2].type, 'separator');
assert.strictEqual(res1.blocks[3].type, 'paragraph');
assert.strictEqual(res1.blocks[3].spans[0].text, 'C');
console.log('  Subtest 4B-a: <div><p>A</p><h2>B</h2><hr><p>C</p></div> strictly preserved block boundaries');

// b. <p><strong>A<span><img src="..."></span>B</strong></p> -> P(A, bold) -> Img -> P(B, bold)
const regression2Html = `
<div class="reading-content">
  <p><strong>A<span><img src="https://example.com/pic.jpg" alt="Nested Img"></span>B</strong></p>
</div>`;
const res2 = extractChapterContent(regression2Html, {
  novelId: 'test-novel',
  chapterId: 'chapter-reg-2',
  baseUrl: 'https://meionovels.com',
  chapterPageUrl: 'https://meionovels.com/novel/test-novel/chapter-reg-2/',
});
assert.strictEqual(res2.blocks.length, 3);
assert.strictEqual(res2.blocks[0].type, 'paragraph');
assert.strictEqual(res2.blocks[0].spans[0].text, 'A');
assert.strictEqual(res2.blocks[0].spans[0].bold, true);

assert.strictEqual(res2.blocks[1].type, 'image');
assert.strictEqual(res2.blocks[1].id, 'img_01');

assert.strictEqual(res2.blocks[2].type, 'paragraph');
assert.strictEqual(res2.blocks[2].spans[0].text, 'B');
assert.strictEqual(res2.blocks[2].spans[0].bold, true);
console.log('  Subtest 4B-b: <p><strong>A<span><img ...></span>B</strong></p> preserved formatting and order');

// c. <figure><img src="..."></figure> -> Img
const regression3Html = `
<div class="reading-content">
  <figure><img src="https://example.com/figure.jpg" alt="Figure Img"></figure>
</div>`;
const res3 = extractChapterContent(regression3Html, {
  novelId: 'test-novel',
  chapterId: 'chapter-reg-3',
  baseUrl: 'https://meionovels.com',
  chapterPageUrl: 'https://meionovels.com/novel/test-novel/chapter-reg-3/',
});
assert.strictEqual(res3.blocks.length, 1);
assert.strictEqual(res3.blocks[0].type, 'image');
assert.strictEqual(res3.blocks[0].id, 'img_01');
assert.strictEqual(res3.images[0].remoteUrl, 'https://example.com/figure.jpg');
console.log('  Subtest 4B-c: <figure><img ...></figure> cleanly extracted as ImageBlock\n');

// 4C. Promo Sanitization Regressions (Review Finding 2)
console.log('--- 4C. Testing Specific Promo Sanitization Regressions ---');

const mixedPromoHtml = `
<div class="reading-content">
  <p>Paragraf cerita sebelum donasi. Dukung kami di <a href="https://trakteer.id/author">Trakteer</a> untuk bab baru!</p>
  <p>Teks cerita dengan <a href="https://example.com/search?q=trakteer.id">tautan cerita bertema trakteer</a> yang valid.</p>
  <div class="donation-box">
    <p>Khusus donasi saweria: <a href="https://saweria.co/dev">Saweria</a></p>
  </div>
</div>`;
const resPromo = extractChapterContent(mixedPromoHtml, {
  novelId: 'test-novel',
  chapterId: 'chapter-promo',
  baseUrl: 'https://meionovels.com',
  chapterPageUrl: 'https://meionovels.com/novel/test-novel/chapter-promo/',
});

const promoParagraphs = resPromo.blocks.filter((b) => b.type === 'paragraph');
assert.strictEqual(promoParagraphs.length, 2, 'Must have 2 story paragraphs, dedicated box removed');

const p1Text = promoParagraphs[0].spans.map((s) => s.text).join('');
assert(p1Text.includes('Paragraf cerita sebelum donasi. Dukung kami di  untuk bab baru!'));
assert(!p1Text.includes('Trakteer'), 'Trakteer link must be stripped');

const p2Text = promoParagraphs[1].spans.map((s) => s.text).join('');
assert(p2Text.includes('tautan cerita bertema trakteer'), 'Story link with promo domain in query must be unwrapped, not removed');

console.log('✔ Promo sanitization strictly preserves mixed story content & query string links\n');

// ---------------------------------------------------------------------------
// 5. Lazy Image Precedence & Relative URL Resolution (Correction 5)
// ---------------------------------------------------------------------------
console.log('--- 5. Testing Lazy Image Precedence & Relative URL Resolution ---');

const lazyHtml = fs.readFileSync(path.join(fixturesDir, 'chapter-lazy-images.html'), 'utf8');
const lazyResult = extractChapterContent(lazyHtml, {
  novelId: 'test-novel',
  chapterId: 'chapter-3',
  baseUrl: 'https://meionovels.com',
  chapterPageUrl: 'https://meionovels.com/novel/test-novel/chapter-3/',
});

assert.strictEqual(lazyResult.images.length, 3, 'Expected exactly 3 images');
assert.strictEqual(lazyResult.images[0].imageId, 'img_01');
assert.strictEqual(lazyResult.images[0].remoteUrl, 'https://example.com/real-image-1.jpg', 'Lazy data-src must take precedence over data: SVG placeholder');

assert.strictEqual(lazyResult.images[1].imageId, 'img_02');
assert.strictEqual(
  lazyResult.images[1].remoteUrl,
  'https://meionovels.com/novel/test-novel/chapter-3/relative-image-2.jpg',
  'Relative image URL must resolve against chapterPageUrl'
);

assert.strictEqual(lazyResult.images[2].imageId, 'img_03');
assert.strictEqual(lazyResult.images[2].remoteUrl, 'https://example.com/direct-image-3.jpg');

console.log('✔ Lazy-load attributes preferred over placeholder src & relative URLs resolved accurately\n');

// ---------------------------------------------------------------------------
// 6. PRD Content Validation: Short Text & Image-Only Chapters (Correction 1)
// ---------------------------------------------------------------------------
console.log('--- 6. Testing PRD Content Validation (Short Text & Image-Only) ---');

// 6A. Short text chapter (e.g. 20 chars) - MUST BE VALID
const shortTextHtml = fs.readFileSync(path.join(fixturesDir, 'chapter-short-text.html'), 'utf8');
const shortResult = extractChapterContent(shortTextHtml, {
  novelId: 'test-novel',
  chapterId: 'chapter-1',
  baseUrl: 'https://meionovels.com',
  chapterPageUrl: 'https://meionovels.com/novel/test-novel/chapter-1/',
});
assert.strictEqual(shortResult.blocks.length, 1);
assert.strictEqual(shortResult.blocks[0].type, 'paragraph');
assert.strictEqual(shortResult.blocks[0].spans[0].text, 'Ini bab sangat pendek.');
console.log('  Subtest 6A: Short text chapter (< 100 chars) correctly parsed as valid per PRD');

// 6B. Image-only chapter (0 text paragraphs, 2 images) - MUST BE VALID
const imageOnlyHtml = fs.readFileSync(path.join(fixturesDir, 'chapter-image-only.html'), 'utf8');
const imageOnlyResult = extractChapterContent(imageOnlyHtml, {
  novelId: 'test-novel',
  chapterId: 'chapter-2',
  baseUrl: 'https://meionovels.com',
  chapterPageUrl: 'https://meionovels.com/novel/test-novel/chapter-2/',
});
assert.strictEqual(imageOnlyResult.blocks.length, 2);
assert.strictEqual(imageOnlyResult.blocks[0].type, 'image');
assert.strictEqual(imageOnlyResult.blocks[1].type, 'image');
assert.strictEqual(imageOnlyResult.images.length, 2);
console.log('  Subtest 6B: Image-only chapter (0 text paragraphs) correctly parsed as valid per PRD\n');

// ---------------------------------------------------------------------------
// 7. Error Classification & Boundaries (Correction 3 & 4)
// ---------------------------------------------------------------------------
console.log('--- 7. Testing Error Classification & Boundaries ---');

// 7A. Truly empty content -> CHAPTER_EMPTY_CONTENT (422)
const emptyHtml = fs.readFileSync(path.join(fixturesDir, 'chapter-empty.html'), 'utf8');
assert.throws(
  () =>
    extractChapterContent(emptyHtml, {
      novelId: 'test-novel',
      chapterId: 'chapter-5',
      baseUrl: 'https://meionovels.com',
      chapterPageUrl: 'https://meionovels.com/novel/test-novel/chapter-5/',
    }),
  (err) => err instanceof ProviderError && err.status === 422 && err.code === 'CHAPTER_EMPTY_CONTENT',
  'Empty content must throw 422 CHAPTER_EMPTY_CONTENT'
);
console.log('  Subtest 7A: Empty content correctly throws CHAPTER_EMPTY_CONTENT (422)');

// 7B. Missing reading container on reader page -> SCRAPER_PARSE_ERROR (500)
const corruptedHtml = fs.readFileSync(path.join(fixturesDir, 'chapter-corrupted.html'), 'utf8');
assert.throws(
  () =>
    extractChapterContent(corruptedHtml, {
      novelId: 'test-novel',
      chapterId: 'chapter-6',
      baseUrl: 'https://meionovels.com',
      chapterPageUrl: 'https://meionovels.com/novel/test-novel/chapter-6/',
    }),
  (err) => err instanceof ProviderError && err.status === 500 && err.code === 'SCRAPER_PARSE_ERROR',
  'Corrupted reader layout must throw 500 SCRAPER_PARSE_ERROR'
);
console.log('  Subtest 7B: Corrupted reader layout correctly throws SCRAPER_PARSE_ERROR (500)');

// 7C. Soft-404 where upstream returned novel detail page -> PROVIDER_NOT_FOUND (404)
const soft404Html = fs.readFileSync(path.join(fixturesDir, 'chapter-404-novel-page.html'), 'utf8');
assert.throws(
  () =>
    extractChapterContent(soft404Html, {
      novelId: 'kimi-wa-boku-no-koukai-ln',
      chapterId: 'non-existent-chapter-xyz',
      baseUrl: 'https://meionovels.com',
      chapterPageUrl: 'https://meionovels.com/novel/kimi-wa-boku-no-koukai-ln/non-existent-chapter-xyz/',
    }),
  (err) => err instanceof ProviderError && err.status === 404 && err.code === 'PROVIDER_NOT_FOUND',
  'Soft-404 novel detail page must throw 404 PROVIDER_NOT_FOUND'
);
console.log('  Subtest 7C: Soft-404 redirected to novel detail page correctly throws PROVIDER_NOT_FOUND (404)');

// 7D. Bot challenge -> PROVIDER_BLOCKED (503)
const challengeHtml = fs.readFileSync(path.join(fixturesDir, 'chapter-challenge.html'), 'utf8');
assert.throws(
  () =>
    extractChapterContent(challengeHtml, {
      novelId: 'test-novel',
      chapterId: 'chapter-7',
      baseUrl: 'https://meionovels.com',
      chapterPageUrl: 'https://meionovels.com/novel/test-novel/chapter-7/',
    }),
  (err) => err instanceof ProviderError && err.status === 503 && err.code === 'PROVIDER_BLOCKED',
  'Bot challenge must throw 503 PROVIDER_BLOCKED'
);
console.log('  Subtest 7D: Bot protection challenge correctly throws PROVIDER_BLOCKED (503)');

// 7E. Navigation Validation Regressions (Review Finding 3)
console.log('--- 7E. Testing Navigation Validation Regressions ---');

// a. Root-relative navigation URL
const navRelHtml = `
<div class="reading-content"><p>Cerita bab 2.</p></div>
<a class="prev_page" href="/novel/test-novel/chapter-1/">Prev</a>
<a class="next_page" href="/novel/test-novel/chapter-3/">Next</a>
`;
const navRelRes = extractChapterContent(navRelHtml, {
  novelId: 'test-novel',
  chapterId: 'chapter-2',
  baseUrl: 'https://meionovels.com',
  chapterPageUrl: 'https://meionovels.com/novel/test-novel/chapter-2/',
});
assert.strictEqual(navRelRes.prevChapterId, 'chapter-1');
assert.strictEqual(navRelRes.nextChapterId, 'chapter-3');
console.log('  Subtest 7E-a: Relative navigation URLs correctly resolved');

// b. Legitimate absent / disabled navigation
const navDisabledHtml = `
<div class="reading-content"><p>Cerita bab 1.</p></div>
<a class="prev_page disabled" href="https://meionovels.com/novel/test-novel/chapter-0/">Prev</a>
<a class="next_page" href="#">Next</a>
`;
const navDisabledRes = extractChapterContent(navDisabledHtml, {
  novelId: 'test-novel',
  chapterId: 'chapter-1',
  baseUrl: 'https://meionovels.com',
  chapterPageUrl: 'https://meionovels.com/novel/test-novel/chapter-1/',
});
assert.strictEqual(navDisabledRes.prevChapterId, null, 'Disabled prev link must be null');
assert.strictEqual(navDisabledRes.nextChapterId, null, 'Placeholder # next link must be null');
console.log('  Subtest 7E-b: Legitimate absent/disabled navigation correctly returns null');

// c. Foreign novel navigation -> must throw SCRAPER_PARSE_ERROR (500)
const navForeignHtml = `
<div class="reading-content"><p>Cerita bab 2.</p></div>
<a class="next_page" href="https://meionovels.com/novel/foreign-novel/chapter-3/">Next</a>
`;
assert.throws(
  () =>
    extractChapterContent(navForeignHtml, {
      novelId: 'test-novel',
      chapterId: 'chapter-2',
      baseUrl: 'https://meionovels.com',
      chapterPageUrl: 'https://meionovels.com/novel/test-novel/chapter-2/',
    }),
  (err) => err instanceof ProviderError && err.status === 500 && err.code === 'SCRAPER_PARSE_ERROR' && err.message.includes('does not belong to novel'),
  'Foreign novel navigation URL must throw SCRAPER_PARSE_ERROR'
);
console.log('  Subtest 7E-c: Foreign novel navigation strictly throws SCRAPER_PARSE_ERROR (500)');

// d. Cross-origin navigation -> must throw SCRAPER_PARSE_ERROR (500)
const navCrossHtml = `
<div class="reading-content"><p>Cerita bab 2.</p></div>
<a class="next_page" href="https://evil.com/novel/test-novel/chapter-3/">Next</a>
`;
assert.throws(
  () =>
    extractChapterContent(navCrossHtml, {
      novelId: 'test-novel',
      chapterId: 'chapter-2',
      baseUrl: 'https://meionovels.com',
      chapterPageUrl: 'https://meionovels.com/novel/test-novel/chapter-2/',
    }),
  (err) => err instanceof ProviderError && err.status === 500 && err.code === 'SCRAPER_PARSE_ERROR' && err.message.includes('Cross-origin'),
  'Cross-origin navigation URL must throw SCRAPER_PARSE_ERROR'
);
console.log('  Subtest 7E-d: Cross-origin navigation strictly throws SCRAPER_PARSE_ERROR (500)');

// e. Traversal navigation -> must throw SCRAPER_PARSE_ERROR (500)
const navTraversalHtml = `
<div class="reading-content"><p>Cerita bab 2.</p></div>
<a class="next_page" href="../other-novel/chapter-3/">Next</a>
`;
assert.throws(
  () =>
    extractChapterContent(navTraversalHtml, {
      novelId: 'test-novel',
      chapterId: 'chapter-2',
      baseUrl: 'https://meionovels.com',
      chapterPageUrl: 'https://meionovels.com/novel/test-novel/chapter-2/',
    }),
  (err) => err instanceof ProviderError && err.status === 500 && err.code === 'SCRAPER_PARSE_ERROR' && err.message.includes('Path traversal'),
  'Traversal navigation URL must throw SCRAPER_PARSE_ERROR'
);

const navEncodedTraversalHtml = `
<div class="reading-content"><p>Cerita bab 2.</p></div>
<a class="next_page" href="%2e%2e/chapter-3/">Next</a>
`;
assert.throws(
  () =>
    extractChapterContent(navEncodedTraversalHtml, {
      novelId: 'test-novel',
      chapterId: 'chapter-2',
      baseUrl: 'https://meionovels.com',
      chapterPageUrl: 'https://meionovels.com/novel/test-novel/chapter-2/',
    }),
  (err) => err instanceof ProviderError && err.status === 500 && err.code === 'SCRAPER_PARSE_ERROR' && err.message.includes('Path traversal'),
  'Encoded traversal navigation URL must throw SCRAPER_PARSE_ERROR'
);
console.log('  Subtest 7E-e: Literal and encoded traversal navigation strictly throws SCRAPER_PARSE_ERROR (500)\n');

// ---------------------------------------------------------------------------
// 8. Total 8-Second Deadline & Redirect Security on Mock Server
// ---------------------------------------------------------------------------
console.log('--- 8. Testing Total 8-Second Deadline & Redirect Security on Mock Server ---');

const mockServer = http.createServer((req, res) => {
  const url = req.url || '';

  if (url.includes('/hanging-chapter')) {
    // Hang without response
    return;
  }

  if (url.includes('/redirect-cross-origin')) {
    res.writeHead(302, { Location: 'https://evil-hacker.com/steal-token' });
    res.end();
    return;
  }

  if (url.includes('/redirect-to-novel-page')) {
    res.writeHead(302, { Location: '/novel/test-novel/' });
    res.end();
    return;
  }

  if (url.includes('/redirect-different-chapter')) {
    res.writeHead(302, { Location: '/novel/test-novel/chapter-999/' });
    res.end();
    return;
  }

  if (url === '/novel/test-novel/') {
    // Serve novel detail page
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(soft404Html);
    return;
  }

  if (url === '/novel/test-novel/chapter-999/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(shortTextHtml);
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(shortTextHtml);
});

await new Promise((resolve) => mockServer.listen(0, resolve));
const mockPort = mockServer.address().port;
const mockBaseUrl = `http://127.0.0.1:${mockPort}`;

const testClient = new ResilientHttpClient({
  totalTimeoutMs: 200,
  perAttemptTimeoutMs: 200,
  maxRetries: 0,
});

const mockProvider = new MeionovelProvider(mockBaseUrl, testClient);

// 8A. Hanging request aborts at total deadline (SLA-NAV-03)
let timeoutErr = null;
const startTimer = Date.now();
try {
  await mockProvider.getChapterContent('test-novel', 'hanging-chapter', { totalTimeoutMs: 200 });
} catch (err) {
  timeoutErr = err;
}
const elapsed = Date.now() - startTimer;
assert(timeoutErr instanceof ProviderError);
assert.strictEqual(timeoutErr.status, 504);
assert.strictEqual(timeoutErr.code, 'PROVIDER_TIMEOUT');
assert(elapsed < 1000, `Hanging chapter should abort around 200ms, elapsed: ${elapsed}ms`);
console.log(`  Subtest 8A: Hanging chapter correctly aborted with PROVIDER_TIMEOUT (504) in ${elapsed}ms`);

// 8B. Cross-origin redirect rejected BEFORE following (Correction 4)
let crossOriginErr = null;
try {
  await mockProvider.getChapterContent('test-novel', 'redirect-cross-origin');
} catch (err) {
  crossOriginErr = err;
}
assert(crossOriginErr instanceof ProviderError);
assert.strictEqual(crossOriginErr.status, 500);
assert(crossOriginErr.message.includes('Cross-origin redirect rejected'), 'Must reject cross-origin redirect');
console.log('  Subtest 8B: Cross-origin redirect strictly rejected before following');

// 8C. Redirect to novel page detected as soft-404
let redirectNovelErr = null;
try {
  await mockProvider.getChapterContent('test-novel', 'redirect-to-novel-page');
} catch (err) {
  redirectNovelErr = err;
}
assert(redirectNovelErr instanceof ProviderError);
assert.strictEqual(redirectNovelErr.status, 404);
assert.strictEqual(redirectNovelErr.code, 'PROVIDER_NOT_FOUND');
console.log('  Subtest 8C: Redirect to novel page correctly caught and mapped to PROVIDER_NOT_FOUND (404)');

// 8D. Redirect to different chapter rejected
let redirectDiffErr = null;
try {
  await mockProvider.getChapterContent('test-novel', 'redirect-different-chapter');
} catch (err) {
  redirectDiffErr = err;
}
assert(redirectDiffErr instanceof ProviderError);
assert.strictEqual(redirectDiffErr.status, 500);
assert.strictEqual(redirectDiffErr.code, 'SCRAPER_PARSE_ERROR');
console.log('  Subtest 8D: Redirect to different chapter strictly caught and rejected\n');

mockServer.close();

// ---------------------------------------------------------------------------
// 9. Live Smoke Testing (Only run if --live flag is passed)
// ---------------------------------------------------------------------------
if (!isLive) {
  console.log('=== OFFLINE FIXTURE VERIFICATION COMPLETED (ALL PASSED) ===');
  console.log('Note: To execute live upstream smoke test, run:');
  console.log('  npm run test:chapter-content:live\n');
  process.exit(0);
}

console.log('--- 9. Live Smoke Testing on Upstream (meionovels.com) ---');

// 9A. Live Kimi wa Boku no Koukai LN Vol 1 Ch 1
try {
  console.log('Executing live getChapterContent("kimi-wa-boku-no-koukai-ln", "volume-1-chapter-1")...');
  const liveKimi = await meionovelProvider.getChapterContent('kimi-wa-boku-no-koukai-ln', 'volume-1-chapter-1');
  assert.strictEqual(liveKimi.id, 'volume-1-chapter-1');
  assert.strictEqual(liveKimi.novelId, 'kimi-wa-boku-no-koukai-ln');
  assert(liveKimi.blocks.length >= 50, `Expected >= 50 blocks, got ${liveKimi.blocks.length}`);
  assert(liveKimi.images.length >= 1, `Expected >= 1 image, got ${liveKimi.images.length}`);
  assert(liveKimi.prevChapterId !== undefined, 'prevChapterId must be present');
  assert(liveKimi.nextChapterId !== undefined, 'nextChapterId must be present');
  console.log(`✔ Live Kimi chapter verified (${liveKimi.blocks.length} blocks, ${liveKimi.images.length} images)`);
} catch (err) {
  console.error('❌ Live Kimi chapter fetch failed:', err);
  process.exit(1);
}

// 9B. Live BTTH MTL Ch 1 (subpath preservation)
try {
  console.log('Executing live getChapterContent("btth", "mtl/chapter-1")...');
  const liveBtth = await meionovelProvider.getChapterContent('btth', 'mtl/chapter-1');
  assert.strictEqual(liveBtth.id, 'mtl/chapter-1');
  assert.strictEqual(liveBtth.novelId, 'btth');
  assert(liveBtth.blocks.length >= 50, `Expected >= 50 blocks, got ${liveBtth.blocks.length}`);
  assert.strictEqual(liveBtth.prevChapterId, null);
  assert(liveBtth.nextChapterId && liveBtth.nextChapterId.startsWith('mtl/'), 'Next chapter must preserve subpath mtl/');
  console.log(`✔ Live BTTH MTL chapter verified (${liveBtth.blocks.length} blocks, next: ${liveBtth.nextChapterId})`);
} catch (err) {
  console.error('❌ Live BTTH MTL chapter fetch failed:', err);
  process.exit(1);
}

// 9C. Live non-existent chapter (must throw 404 PROVIDER_NOT_FOUND)
try {
  console.log('Executing live getChapterContent on non-existent chapter...');
  let notFoundErr = null;
  try {
    await meionovelProvider.getChapterContent('kimi-wa-boku-no-koukai-ln', 'non-existent-chapter-xyz-999');
  } catch (err) {
    notFoundErr = err;
  }
  assert(notFoundErr instanceof ProviderError);
  assert.strictEqual(notFoundErr.status, 404);
  assert.strictEqual(notFoundErr.code, 'PROVIDER_NOT_FOUND');
  console.log('✔ Live non-existent chapter correctly throws 404 PROVIDER_NOT_FOUND');
} catch (err) {
  console.error('❌ Live non-existent chapter assertion failed:', err);
  process.exit(1);
}

console.log('\n=== LIVE SMOKE TESTS COMPLETED (ALL PASSED) ===\n');
