import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import {
  ResilientHttpClient,
  httpClient,
  DEFAULT_USER_AGENT,
  parseRetryAfter,
} from '../server/dist/services/httpClient.js';
import { ProviderError } from '../server/dist/errors/provider.error.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const serverDir = path.join(rootDir, 'server');

console.log('=== [BE-01] Resilient HTTP Client & Provider Interface Verification ===\n');

// ---------------------------------------------------------------------------
// 1. Verification of Default Schedule & Settings (Tasks.md & PRD Conformity)
// ---------------------------------------------------------------------------
console.log('--- 1. Verifying Default Configuration & Unjittered Schedule ---');
assert.strictEqual(
  httpClient.defaultPerAttemptTimeoutMs,
  8000,
  'Default per-attempt timeout must be 8000ms'
);
assert.strictEqual(
  httpClient.defaultTotalTimeoutMs,
  8000,
  'Default total operation deadline must be 8000ms per SLA-NAV-03 and reader navigation specification'
);
assert.strictEqual(
  httpClient.defaultMaxRetries,
  3,
  'Default max retries must be 3 (1 initial + 3 retries = 4 attempts)'
);
assert.deepStrictEqual(
  httpClient.defaultRetryDelays,
  [2000, 5000, 10000],
  'Default retry delays must strictly be [2000, 5000, 10000]ms without jitter'
);
console.log('✔ Default configuration verified: 8000ms total deadline (SLA-NAV-03), 8000ms attempt timeout, [2000, 5000, 10000] schedule\n');

// ---------------------------------------------------------------------------
// 2. Unit Testing of parseRetryAfter (Seconds & RFC 7231 HTTP-Date)
// ---------------------------------------------------------------------------
console.log('--- 2. Verifying Retry-After Parsing (Seconds & HTTP-Date) ---');
// A. Integer seconds
assert.strictEqual(parseRetryAfter('120'), 120000, 'Integer seconds 120 must parse to 120000ms');
assert.strictEqual(parseRetryAfter('0'), 0, 'Integer seconds 0 must parse to 0ms');
assert.strictEqual(parseRetryAfter(' 5 '), 5000, 'Whitespace padded seconds must parse cleanly');

// B. RFC 7231 / RFC 2616 HTTP-date
const futureDate = new Date(Date.now() + 60000);
const futureHttpDate = futureDate.toUTCString();
const parsedFutureMs = parseRetryAfter(futureHttpDate);
assert(
  parsedFutureMs !== null && parsedFutureMs > 55000 && parsedFutureMs <= 60000,
  `Future HTTP-date must parse to ~60000ms, got: ${parsedFutureMs}`
);

// Past date should clamp to 0
const pastHttpDate = new Date(Date.now() - 10000).toUTCString();
assert.strictEqual(parseRetryAfter(pastHttpDate), 0, 'Past HTTP-date must clamp to 0ms');

// C. Invalid headers (negative numbers, fractions, unparseable strings)
assert.strictEqual(parseRetryAfter(undefined), null, 'undefined must return null');
assert.strictEqual(parseRetryAfter(''), null, 'empty string must return null');
assert.strictEqual(parseRetryAfter('-1'), null, "'-1' must return null (negative numbers not accepted as seconds or date)");
assert.strictEqual(parseRetryAfter('1.5'), null, "'1.5' must return null (fractions not accepted as seconds or date)");
assert.strictEqual(parseRetryAfter('-1.5'), null, "'-1.5' must return null");
assert.strictEqual(parseRetryAfter('0.5'), null, "'0.5' must return null");
assert.strictEqual(parseRetryAfter('invalid_format'), null, 'unparseable string must return null');
console.log('✔ parseRetryAfter correctly handles integer seconds, RFC 7231 HTTP-dates, and invalid fallbacks (-1, 1.5, etc.)\n');

// ---------------------------------------------------------------------------
// 3. Setup Local Mock HTTP Server for Network & Status Simulation
// ---------------------------------------------------------------------------
let retrySuccessHits = 0;
let perAttemptTimeoutHits = 0;
let totalDeadlineHits = 0;
let notFoundHits = 0;
let blockedHits = 0;
let rateLimitSecHits = 0;
let rateLimitSecTimestamps = [];
let rateLimitDateHits = 0;
let rateLimitDateTimestamps = [];
let rateLimitDateTargetMs = 0;
let rateLimitExceedHits = 0;
let rateLimitInvalidHits = 0;
let rateLimitNegHits = 0;
let rateLimitNegTimestamps = [];
let rateLimitFracHits = 0;
let rateLimitFracTimestamps = [];
let capturedHeaders = null;

const server = http.createServer((req, res) => {
  const url = req.url || '';

  // Case A: 2 failures (ECONNRESET then 500) then 200 OK
  if (url === '/test-retry-success') {
    retrySuccessHits++;
    if (retrySuccessHits === 1) {
      req.socket.destroy(); // Simulates ECONNRESET
      return;
    }
    if (retrySuccessHits === 2) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Upstream 500 Server Error');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<html><body>Recovered on attempt 3</body></html>');
    return;
  }

  // Case B: Per-attempt timeout simulation (delayed by 300ms)
  if (url === '/test-attempt-timeout') {
    perAttemptTimeoutHits++;
    setTimeout(() => {
      if (!res.writableEnded) {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Delayed attempt');
      }
    }, 250);
    return;
  }

  // Case C: Total operation deadline exceedance
  if (url === '/test-total-deadline') {
    totalDeadlineHits++;
    // Never responds to trigger root deadline abort
    return;
  }

  // Case D: 404 Not Found
  if (url === '/test-not-found') {
    notFoundHits++;
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Novel Not Found');
    return;
  }

  // Case E: 403 Forbidden
  if (url === '/test-blocked') {
    blockedHits++;
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Cloudflare Challenge');
    return;
  }

  // Case F: 429 with Retry-After: 1 (1 second)
  if (url === '/test-429-seconds') {
    rateLimitSecHits++;
    rateLimitSecTimestamps.push(Date.now());
    if (rateLimitSecHits === 1) {
      res.writeHead(429, {
        'Content-Type': 'text/plain',
        'Retry-After': '1',
      });
      res.end('Rate Limit Exceeded (1s)');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<html><body>Success after 429 seconds retry</body></html>');
    return;
  }

  // Case G: 429 with Retry-After in RFC 7231 HTTP-Date (clearly in future)
  if (url === '/test-429-date') {
    rateLimitDateHits++;
    const now = Date.now();
    rateLimitDateTimestamps.push(now);
    if (rateLimitDateHits === 1) {
      // Future HTTP-date target: rounded to next second boundary ~1.5s in the future
      const targetTime = now + 1500;
      const targetDate = new Date(Math.ceil(targetTime / 1000) * 1000);
      rateLimitDateTargetMs = targetDate.getTime();
      const httpDate = targetDate.toUTCString();
      res.writeHead(429, {
        'Content-Type': 'text/plain',
        'Retry-After': httpDate,
      });
      res.end(`Rate Limit Exceeded (until ${httpDate})`);
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<html><body>Success after 429 date retry</body></html>');
    return;
  }

  // Case H: 429 with Retry-After exceeding deadline
  if (url === '/test-429-exceed') {
    rateLimitExceedHits++;
    res.writeHead(429, {
      'Content-Type': 'text/plain',
      'Retry-After': '30', // 30 seconds
    });
    res.end('Rate Limit Exceeded (30s required)');
    return;
  }

  // Case I: 429 with invalid Retry-After header string
  if (url === '/test-429-invalid') {
    rateLimitInvalidHits++;
    if (rateLimitInvalidHits === 1) {
      res.writeHead(429, {
        'Content-Type': 'text/plain',
        'Retry-After': 'invalid_garbage_header',
      });
      res.end('Rate Limit Exceeded');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<html><body>Success after invalid 429 fallback</body></html>');
    return;
  }

  // Case K: 429 with Retry-After: -1 (negative value, must use fallback schedule)
  if (url === '/test-429-negative') {
    rateLimitNegHits++;
    rateLimitNegTimestamps.push(Date.now());
    if (rateLimitNegHits === 1) {
      res.writeHead(429, {
        'Content-Type': 'text/plain',
        'Retry-After': '-1',
      });
      res.end('Rate Limit Exceeded (-1)');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<html><body>Success after -1 fallback retry</body></html>');
    return;
  }

  // Case L: 429 with Retry-After: 1.5 (fraction value, must use fallback schedule)
  if (url === '/test-429-fraction') {
    rateLimitFracHits++;
    rateLimitFracTimestamps.push(Date.now());
    if (rateLimitFracHits === 1) {
      res.writeHead(429, {
        'Content-Type': 'text/plain',
        'Retry-After': '1.5',
      });
      res.end('Rate Limit Exceeded (1.5)');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<html><body>Success after 1.5 fallback retry</body></html>');
    return;
  }

  // Case J: Header capture
  if (url === '/test-headers') {
    capturedHeaders = req.headers;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  res.writeHead(400);
  res.end('Unknown endpoint');
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const baseUrl = `http://127.0.0.1:${port}`;
console.log(`✔ Mock HTTP server listening on ${baseUrl}\n`);

try {
  // -------------------------------------------------------------------------
  // Test 3: Skenario 2x Gagal (ECONNRESET lalu 500) lalu Sukses pada Percobaan ke-3
  // -------------------------------------------------------------------------
  console.log('--- 3. Testing 2 Failures (ECONNRESET + 500) then Success on 3rd Attempt ---');
  const retryLog = [];
  const testClient = new ResilientHttpClient({
    perAttemptTimeoutMs: 1000,
    totalTimeoutMs: 2000,
    maxRetries: 3,
    retryDelays: [20, 40, 60],
    onRetry: (attempt, err, delayMs) => {
      retryLog.push({ attempt, delayMs, err: err?.message || String(err) });
    },
  });

  const res1 = await testClient.get(`${baseUrl}/test-retry-success`);
  assert.strictEqual(res1.status, 200, 'Response status must be 200');
  assert(res1.data.includes('Recovered on attempt 3'), 'Response body must match');
  assert.strictEqual(retrySuccessHits, 3, 'Must have hit mock server exactly 3 times');
  assert.strictEqual(retryLog.length, 2, 'Must have logged 2 retry events');
  assert.strictEqual(retryLog[0].delayMs, 20, 'First delay must strictly be 20ms without jitter');
  assert.strictEqual(retryLog[1].delayMs, 40, 'Second delay must strictly be 40ms without jitter');
  console.log('✔ Test 3 passed: Recovered on attempt 3 with exact unjittered retry delays\n');

  // -------------------------------------------------------------------------
  // Test 4: Skenario Total Operation Deadline Terpisah dari Per-Attempt Timeout
  // -------------------------------------------------------------------------
  console.log('--- 4. Testing Total Operation Deadline vs Per-Attempt Timeout ---');
  // Subtest 4A: Delay exceeds remaining total deadline -> aborts without sleeping
  const deadlineExceedClient = new ResilientHttpClient({
    perAttemptTimeoutMs: 50,
    totalTimeoutMs: 110, // Total deadline: 110ms
    maxRetries: 3,
    retryDelays: [100, 100], // Retry delay 100ms > remaining deadline (~60ms)
  });

  let deadlineExceedErr = null;
  const startT4A = Date.now();
  try {
    await deadlineExceedClient.get(`${baseUrl}/test-attempt-timeout`);
  } catch (err) {
    deadlineExceedErr = err;
  }
  const elapsedT4A = Date.now() - startT4A;

  assert(deadlineExceedErr instanceof ProviderError, 'Must throw ProviderError on deadline exceed');
  assert.strictEqual(deadlineExceedErr.code, 'PROVIDER_TIMEOUT', 'Code must be PROVIDER_TIMEOUT');
  assert.strictEqual(deadlineExceedErr.status, 504, 'Status must be 504');
  assert(
    elapsedT4A < 150,
    `Operation must abort immediately without sleeping 100ms. Elapsed: ${elapsedT4A}ms`
  );
  console.log(`  Subtest 4A: Stopped before retry because delay exceeded deadline (elapsed: ${elapsedT4A}ms)`);

  // Subtest 4B: Total operation deadline aborts active hung request
  const hangingClient = new ResilientHttpClient({
    perAttemptTimeoutMs: 1000,
    totalTimeoutMs: 120, // Deadline is 120ms
    maxRetries: 2,
    retryDelays: [50, 50],
  });

  let hangingErr = null;
  const startT4B = Date.now();
  try {
    await hangingClient.get(`${baseUrl}/test-total-deadline`);
  } catch (err) {
    hangingErr = err;
  }
  const elapsedT4B = Date.now() - startT4B;

  assert(hangingErr instanceof ProviderError, 'Must throw ProviderError on total deadline abort');
  assert.strictEqual(hangingErr.code, 'PROVIDER_TIMEOUT', 'Code must be PROVIDER_TIMEOUT');
  assert.strictEqual(hangingErr.status, 504, 'Status must be 504');
  assert(
    elapsedT4B >= 110 && elapsedT4B < 250,
    `Active request must be aborted at total deadline (~120ms). Elapsed: ${elapsedT4B}ms`
  );
  console.log(`  Subtest 4B: Active hung request aborted strictly at total deadline (elapsed: ${elapsedT4B}ms)`);
  console.log('✔ Test 4 passed: Total operation deadline strictly separates attempt timeout from total deadline\n');

  // -------------------------------------------------------------------------
  // Test 5: Skenario 429 Rate Limit & Retry-After Handling
  // -------------------------------------------------------------------------
  console.log('--- 5. Testing 429 Rate Limit & Retry-After Handling ---');
  // Subtest 5A: 429 with integer seconds Retry-After: 1 (server arrival verification)
  const secRetryLogs = [];
  const sec429Client = new ResilientHttpClient({
    perAttemptTimeoutMs: 2000,
    totalTimeoutMs: 4000,
    maxRetries: 2,
    retryDelays: [5000, 5000], // Fallback is 5000ms, but header says '1' (1000ms)
    onRetry: (attempt, err, delayMs) => {
      secRetryLogs.push({ attempt, delayMs });
    },
  });
  const resSec429 = await sec429Client.get(`${baseUrl}/test-429-seconds`);
  assert.strictEqual(resSec429.status, 200);
  assert(resSec429.data.includes('Success after 429 seconds retry'));
  assert.strictEqual(rateLimitSecHits, 2, 'Should have retried and succeeded on 2nd attempt');
  assert.strictEqual(secRetryLogs.length, 1);
  assert.strictEqual(secRetryLogs[0].delayMs, 1000, 'Reported delay must be 1000ms from header');
  const elapsedSec = rateLimitSecTimestamps[1] - rateLimitSecTimestamps[0];
  assert(
    elapsedSec >= 950,
    `Retry arrived too early on server! Requested 1000ms, arrival diff: ${elapsedSec}ms`
  );
  console.log(`  Subtest 5A: 429 with Retry-After: 1 waited ${elapsedSec}ms on server (>= 950ms)`);

  // Subtest 5B: 429 with HTTP-Date Retry-After (future date, server arrival verification)
  const dateRetryLogs = [];
  const date429Client = new ResilientHttpClient({
    perAttemptTimeoutMs: 3000,
    totalTimeoutMs: 6000,
    maxRetries: 2,
    retryDelays: [5000, 5000], // Fallback is 5000ms, but header has future HTTP-date
    onRetry: (attempt, err, delayMs) => {
      dateRetryLogs.push({ attempt, delayMs });
    },
  });
  const resDate429 = await date429Client.get(`${baseUrl}/test-429-date`);
  assert.strictEqual(resDate429.status, 200);
  assert(resDate429.data.includes('Success after 429 date retry'));
  assert.strictEqual(rateLimitDateHits, 2, 'Should have retried and succeeded on 2nd attempt');
  assert.strictEqual(dateRetryLogs.length, 1);
  const elapsedDate = rateLimitDateTimestamps[1] - rateLimitDateTimestamps[0];
  assert(
    elapsedDate >= 950,
    `Retry arrived too early on server! Arrival diff: ${elapsedDate}ms`
  );
  assert(
    rateLimitDateTimestamps[1] >= rateLimitDateTargetMs - 50,
    `Retry arrived before requested HTTP-date target on server! retryAt: ${rateLimitDateTimestamps[1]}, target: ${rateLimitDateTargetMs}`
  );
  console.log(`  Subtest 5B: 429 with future HTTP-Date waited ${elapsedDate}ms, arrived after target timestamp`);

  // Subtest 5C: 429 with Retry-After exceeding total deadline
  const exceed429Client = new ResilientHttpClient({
    perAttemptTimeoutMs: 500,
    totalTimeoutMs: 200, // Deadline 200ms
    maxRetries: 2,
  });
  let exceed429Err = null;
  try {
    await exceed429Client.get(`${baseUrl}/test-429-exceed`);
  } catch (err) {
    exceed429Err = err;
  }
  assert(exceed429Err instanceof ProviderError);
  assert.strictEqual(exceed429Err.code, 'PROVIDER_BLOCKED');
  assert.strictEqual(exceed429Err.status, 503);
  assert.strictEqual(rateLimitExceedHits, 1, 'Must NOT retry if Retry-After exceeds deadline');
  console.log('  Subtest 5C: 429 with Retry-After exceeding deadline halted structured with PROVIDER_BLOCKED (503)');

  // Subtest 5D: 429 with invalid Retry-After header string falls back to standard schedule
  const invalid429Client = new ResilientHttpClient({
    perAttemptTimeoutMs: 1000,
    totalTimeoutMs: 2000,
    maxRetries: 2,
    retryDelays: [30, 40],
  });
  const resInvalid429 = await invalid429Client.get(`${baseUrl}/test-429-invalid`);
  assert.strictEqual(resInvalid429.status, 200);
  assert(resInvalid429.data.includes('Success after invalid 429 fallback'));
  assert.strictEqual(rateLimitInvalidHits, 2);
  console.log('  Subtest 5D: 429 with invalid string Retry-After cleanly falls back to standard retry delay');

  // Subtest 5E: 429 with Retry-After: -1 uses fallback schedule (not immediate 0ms)
  const negRetryLogs = [];
  const neg429Client = new ResilientHttpClient({
    perAttemptTimeoutMs: 1000,
    totalTimeoutMs: 2000,
    maxRetries: 2,
    retryDelays: [80, 160], // Fallback delay is 80ms
    onRetry: (attempt, err, delayMs) => {
      negRetryLogs.push({ attempt, delayMs });
    },
  });
  const resNeg429 = await neg429Client.get(`${baseUrl}/test-429-negative`);
  assert.strictEqual(resNeg429.status, 200);
  assert(resNeg429.data.includes('Success after -1 fallback retry'));
  assert.strictEqual(rateLimitNegHits, 2, 'Should retry on fallback');
  assert.strictEqual(negRetryLogs.length, 1);
  assert.strictEqual(negRetryLogs[0].delayMs, 80, 'Must use fallback schedule 80ms, NOT 0ms');
  const elapsedNeg = rateLimitNegTimestamps[1] - rateLimitNegTimestamps[0];
  assert(
    elapsedNeg >= 70,
    `Retry arrived too fast (${elapsedNeg}ms)! Must wait fallback delay (80ms)`
  );
  console.log(`  Subtest 5E: 429 with Retry-After: -1 waited ${elapsedNeg}ms using fallback schedule (80ms), not 0ms`);

  // Subtest 5F: 429 with Retry-After: 1.5 uses fallback schedule (not immediate 0ms)
  const fracRetryLogs = [];
  const frac429Client = new ResilientHttpClient({
    perAttemptTimeoutMs: 1000,
    totalTimeoutMs: 2000,
    maxRetries: 2,
    retryDelays: [80, 160], // Fallback delay is 80ms
    onRetry: (attempt, err, delayMs) => {
      fracRetryLogs.push({ attempt, delayMs });
    },
  });
  const resFrac429 = await frac429Client.get(`${baseUrl}/test-429-fraction`);
  assert.strictEqual(resFrac429.status, 200);
  assert(resFrac429.data.includes('Success after 1.5 fallback retry'));
  assert.strictEqual(rateLimitFracHits, 2, 'Should retry on fallback');
  assert.strictEqual(fracRetryLogs.length, 1);
  assert.strictEqual(fracRetryLogs[0].delayMs, 80, 'Must use fallback schedule 80ms, NOT 0ms');
  const elapsedFrac = rateLimitFracTimestamps[1] - rateLimitFracTimestamps[0];
  assert(
    elapsedFrac >= 70,
    `Retry arrived too fast (${elapsedFrac}ms)! Must wait fallback delay (80ms)`
  );
  console.log(`  Subtest 5F: 429 with Retry-After: 1.5 waited ${elapsedFrac}ms using fallback schedule (80ms), not 0ms`);
  console.log('✔ Test 5 passed: 429 Retry-After parsing, fallback delays (-1, 1.5), and arrival times fully verified\n');

  // -------------------------------------------------------------------------
  // Test 6: Non-Retriable Errors (404 and 403) Fail-Fast Without Retry
  // -------------------------------------------------------------------------
  console.log('--- 6. Testing Non-Retriable Errors (404 & 403) ---');
  let err404 = null;
  try {
    await testClient.get(`${baseUrl}/test-not-found`);
  } catch (err) {
    err404 = err;
  }
  assert(err404 instanceof ProviderError);
  assert.strictEqual(err404.code, 'PROVIDER_NOT_FOUND');
  assert.strictEqual(err404.status, 404);
  assert.strictEqual(notFoundHits, 1, 'Must fail fast on 404 without retrying');

  let err403 = null;
  try {
    await testClient.get(`${baseUrl}/test-blocked`);
  } catch (err) {
    err403 = err;
  }
  assert(err403 instanceof ProviderError);
  assert.strictEqual(err403.code, 'PROVIDER_BLOCKED');
  assert.strictEqual(err403.status, 503);
  assert.strictEqual(blockedHits, 1, 'Must fail fast on 403 without retrying');
  console.log('✔ Test 6 passed: 404 and 403 fail-fast without retry\n');

  // -------------------------------------------------------------------------
  // Test 7: Header Hygiene & Browser Fingerprint
  // -------------------------------------------------------------------------
  console.log('--- 7. Testing Header Hygiene & Anti-Bot Evasion ---');
  await testClient.get(`${baseUrl}/test-headers`);
  assert(capturedHeaders, 'Headers must be captured');
  assert.strictEqual(capturedHeaders['user-agent'], DEFAULT_USER_AGENT);
  assert(capturedHeaders['sec-ch-ua']);
  assert.strictEqual(capturedHeaders['sec-fetch-mode'], 'navigate');
  assert.strictEqual(capturedHeaders['cache-control'], 'no-cache');
  console.log('✔ Test 7 passed: Authentic browser headers verified\n');

  // -------------------------------------------------------------------------
  // Test 8: Real TypeScript Compiler Verification of INovelProvider Interface
  // -------------------------------------------------------------------------
  console.log('--- 8. Real TypeScript Compiler Verification for INovelProvider ---');
  const tempTypeTestPath = path.join(serverDir, 'src/__test_provider_interface__.ts');
  try {
    // 8A: Valid implementation using implements INovelProvider MUST pass tsc
    fs.writeFileSync(
      tempTypeTestPath,
      `import type { INovelProvider } from './interfaces/provider.interface.js';
import type { NovelSummary, NovelDetail, ChapterDetail } from './types/novel.js';

export class ValidNovelProvider implements INovelProvider {
  readonly name = 'valid-test-provider';
  readonly baseUrl = 'https://meionovels.com';

  async getLatest(page?: number): Promise<NovelSummary[]> {
    return [];
  }

  async getTrending(): Promise<NovelSummary[]> {
    return [];
  }

  async search(query: string, page?: number): Promise<NovelSummary[]> {
    return [];
  }

  async getNovelDetails(novelId: string): Promise<NovelDetail> {
    return {
      id: novelId,
      title: 'Title',
      coverUrl: 'https://example.com/cover.jpg',
      chapters: [],
    };
  }

  async getChapterContent(novelId: string, chapterId: string): Promise<ChapterDetail> {
    return {
      id: chapterId,
      novelId,
      title: 'Chapter 1',
      chapterNumber: 1,
      blocks: [],
      images: [],
    };
  }
}
`
    );
    execSync('npx tsc --noEmit', { cwd: serverDir, stdio: 'pipe' });
    console.log('  TypeScript Check 8A: Valid implementation with `implements INovelProvider` compiled cleanly (0 errors)');

    // 8B: Invalid implementation (wrong return type on getChapterContent) MUST fail tsc
    fs.writeFileSync(
      tempTypeTestPath,
      `import type { INovelProvider } from './interfaces/provider.interface.js';
import type { NovelSummary, NovelDetail } from './types/novel.js';

// Broken implementation: getChapterContent returns number instead of Promise<ChapterDetail>
export class BrokenNovelProvider implements INovelProvider {
  readonly name = 'broken-provider';
  readonly baseUrl = 'https://meionovels.com';
  async getLatest(): Promise<NovelSummary[]> { return []; }
  async getTrending(): Promise<NovelSummary[]> { return []; }
  async search(): Promise<NovelSummary[]> { return []; }
  async getNovelDetails(): Promise<NovelDetail> { return {} as NovelDetail; }
  getChapterContent(novelId: string, chapterId: string): number {
    return 12345;
  }
}
`
    );

    let typeErrorCaught = false;
    try {
      execSync('npx tsc --noEmit', { cwd: serverDir, stdio: 'pipe' });
    } catch (err) {
      const output = (err.stdout?.toString() || '') + (err.stderr?.toString() || '');
      if (
        output.includes('BrokenNovelProvider') &&
        (output.includes('INovelProvider') || output.includes('getChapterContent'))
      ) {
        typeErrorCaught = true;
      }
    }
    assert(
      typeErrorCaught,
      'TypeScript compiler must reject BrokenNovelProvider with invalid method return type'
    );
    console.log('  TypeScript Check 8B: Invalid provider implementation successfully rejected by TypeScript compiler');
    console.log('✔ Test 8 passed: Static type-safety and interface contract strictly enforced by compiler\n');
  } finally {
    if (fs.existsSync(tempTypeTestPath)) {
      fs.unlinkSync(tempTypeTestPath);
    }
  }

  console.log('=== ALL BE-01 RESILIENCE & INTERFACE VERIFICATIONS PASSED (0 ERRORS) ===\n');
} finally {
  server.close();
}
