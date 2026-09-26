import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('=== [DIS-03] Novel Search Flow, Debounce, Pagination & API Verification ===\n');

// ---------------------------------------------------------------------------
// 1. Direct Imports of Actual Production Code
// ---------------------------------------------------------------------------
console.log('--- 1. Importing Production Modules ---');

const {
  AppError,
  apiRequest,
} = await import('../client/src/services/api/apiClient.ts');

const {
  validatePageParam,
  getLatestNovels,
  searchNovels,
  validateNovelSummary,
} = await import('../client/src/services/api/novelApi.ts');

const {
  deduplicateNovels,
  calculateNextPageParam,
  evaluateFeedEndReason,
  getSearchEndMessage,
} = await import('../client/src/services/api/feedPagination.ts');

const {
  resolveSearchUiState,
  SearchDebounceManager,
} = await import('../client/src/screens/discover/searchState.ts');

const { QueryClient, InfiniteQueryObserver } = await import('@tanstack/react-query');

console.log('✔ Successfully imported production modules:');
console.log('  - client/src/services/api/apiClient.ts');
console.log('  - client/src/services/api/novelApi.ts (validatePageParam, getLatestNovels, searchNovels)');
console.log('  - client/src/services/api/feedPagination.ts (deduplicateNovels, calculateNextPageParam, getSearchEndMessage)');
console.log('  - client/src/screens/discover/searchState.ts (resolveSearchUiState, SearchDebounceManager)');
console.log('  - @tanstack/react-query (QueryClient, InfiniteQueryObserver)');

// ---------------------------------------------------------------------------
// 2. Strict Shared Page Parameter Validation (getLatestNovels & searchNovels)
// ---------------------------------------------------------------------------
console.log('\n--- 2. Shared Page Parameter Validation & Regressions ---');

// 2.1 Direct validatePageParam validation
const invalidPageValues = [0, -1, -99, 1.5, 2.7, NaN, Infinity, -Infinity, '1', '2', null, undefined, {}, []];

for (const invalid of invalidPageValues) {
  assert.throws(
    () => validatePageParam(invalid),
    (err) => {
      assert(err instanceof AppError, `Must throw AppError for invalid page: ${String(invalid)}`);
      assert.strictEqual(err.code, 'BAD_REQUEST');
      assert.strictEqual(err.status, 400);
      assert(err.message.includes('positif aman'), 'Message must explain positive safe integer');
      return true;
    },
    `validatePageParam must strictly reject: ${String(invalid)}`
  );
}

assert.strictEqual(validatePageParam(1), 1);
assert.strictEqual(validatePageParam(5), 5);
assert.strictEqual(validatePageParam(100), 100);
console.log('✔ validatePageParam strictly rejects 0, negative, float, NaN, Infinity, and non-number values');

// 2.2 Regression test on getLatestNovels: Must NOT silently mutate invalid page to 1
for (const invalid of [0, -5, 1.5, NaN, Infinity]) {
  await assert.rejects(
    async () => getLatestNovels(invalid),
    (err) => {
      assert(err instanceof AppError);
      assert.strictEqual(err.code, 'BAD_REQUEST');
      assert.strictEqual(err.status, 400);
      return true;
    },
    `getLatestNovels must strictly reject invalid page: ${invalid}`
  );
}
console.log('✔ getLatestNovels regression: rejects invalid page before network request without silent mutation');

// 2.3 Regression test on searchNovels: Must NOT silently mutate invalid page to 1
for (const invalid of [0, -5, 1.5, NaN, Infinity]) {
  await assert.rejects(
    async () => searchNovels('test-query', invalid),
    (err) => {
      assert(err instanceof AppError);
      assert.strictEqual(err.code, 'BAD_REQUEST');
      assert.strictEqual(err.status, 400);
      return true;
    },
    `searchNovels must strictly reject invalid page: ${invalid}`
  );
}
console.log('✔ searchNovels regression: rejects invalid page before network request without silent mutation');

// ---------------------------------------------------------------------------
// 3. URL Encoding, Request Parameter Hygiene & Case Preservation
// ---------------------------------------------------------------------------
console.log('\n--- 3. URL Encoding, Request Hygiene & Case Preservation ---');

const originalFetch = globalThis.fetch;
let recordedUrls = [];

try {
  globalThis.fetch = async (url) => {
    const urlStr = String(url);
    recordedUrls.push(urlStr);
    return new Response(
      JSON.stringify({
        success: true,
        data: [
          { id: 'solo-1', title: 'Solo Leveling & More + 読もう', coverUrl: 'https://img.jpg' },
        ],
        error: null,
        meta: { source: 'meionovel', page: 1 },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  // Test special characters: spaces, &, +, and Unicode
  recordedUrls = [];
  const searchResults = await searchNovels('Solo Leveling & More + 読もう', 1);
  assert.strictEqual(searchResults.length, 1);
  assert.strictEqual(recordedUrls.length, 1);

  const calledUrl = recordedUrls[0];
  const expectedEncoded = 'Solo%20Leveling%20%26%20More%20%2B%20%E8%AA%AD%E3%82%82%E3%81%86';
  assert(
    calledUrl.includes(`q=${expectedEncoded}&page=1`),
    `URL must encode spaces (%20), & (%26), + (%2B), and Unicode (%E8%AA%AD%E3%82%82%E3%81%86). Got: ${calledUrl}`
  );

  // Capitalization must be preserved (not forced to lowercase)
  assert(calledUrl.includes('Solo') && calledUrl.includes('More'), 'Capitalization must be preserved');
  console.log('✔ searchNovels encodes special characters (&, +, spaces, Unicode) and preserves original case');

  // Whitespace-only query returns [] immediately without calling fetch
  recordedUrls = [];
  const emptyResults1 = await searchNovels('   ', 1);
  assert.deepStrictEqual(emptyResults1, []);
  assert.strictEqual(recordedUrls.length, 0, 'Whitespace query must not trigger network request');

  const emptyResults2 = await searchNovels('', 1);
  assert.deepStrictEqual(emptyResults2, []);
  assert.strictEqual(recordedUrls.length, 0, 'Empty query must not trigger network request');
  console.log('✔ Empty or whitespace-only search query returns [] immediately without network request');

} finally {
  globalThis.fetch = originalFetch;
}

// ---------------------------------------------------------------------------
// 4. Production SearchDebounceManager (Rapid Input, Reset, Clear)
// ---------------------------------------------------------------------------
console.log('\n--- 4. Production SearchDebounceManager Lifecycle ---');

// 4.1 Rapid input only commits the last keyword
const committedQueries = [];
const debounceDelay = 60; // ms for fast test execution
const manager = new SearchDebounceManager(debounceDelay, (query) => {
  committedQueries.push(query);
});

// Rapid keystrokes: 'k' -> 'ki' -> 'kimi'
manager.setInput('k');
await new Promise((r) => setTimeout(r, 20));
manager.setInput('ki');
await new Promise((r) => setTimeout(r, 20));
manager.setInput('kimi');

// Wait for debounce to elapse
await new Promise((r) => setTimeout(r, debounceDelay + 40));

assert.strictEqual(committedQueries.length, 1, 'Only one commit must occur after rapid typing');
assert.strictEqual(committedQueries[0], 'kimi', 'Only the final keyword "kimi" must be committed');
console.log('✔ Rapid keystrokes within debounce interval only commit the final keyword');

// 4.2 Instant reset on whitespace / empty text
committedQueries.length = 0;
manager.setInput('   ');
assert.strictEqual(committedQueries.length, 1, 'Whitespace must trigger immediate commit');
assert.strictEqual(committedQueries[0], '', 'Committed value must be empty string');

manager.setInput('');
assert.strictEqual(committedQueries.length, 2, 'Empty string must trigger immediate commit');
assert.strictEqual(committedQueries[1], '', 'Committed value must be empty string');
console.log('✔ Empty text and whitespace trigger immediate synchronous reset without delay');

// 4.3 Clear during active pending timer cancels timer and resets
committedQueries.length = 0;
manager.setInput('pending-search');
await new Promise((r) => setTimeout(r, 20));
manager.clear(); // Clear while timer is active

// Wait longer than debounce delay
await new Promise((r) => setTimeout(r, debounceDelay + 40));

assert.strictEqual(committedQueries.length, 1, 'Clear must trigger immediate reset and cancel pending timer');
assert.strictEqual(committedQueries[0], '', 'Committed value must be empty string');
assert(!committedQueries.includes('pending-search'), '"pending-search" must never be committed after clear');
console.log('✔ Clear cancels active pending timer and immediately resets query');

manager.destroy();

// ---------------------------------------------------------------------------
// 5. Late Response Race Condition: Delayed Alpha vs Fast Beta
// ---------------------------------------------------------------------------
console.log('\n--- 5. Late Response Race Condition (Alpha vs Beta) ---');

try {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  let resolveAlpha;
  const alphaPromise = new Promise((resolve) => {
    resolveAlpha = resolve;
  });

  globalThis.fetch = async (url) => {
    const urlStr = String(url);
    if (urlStr.includes('q=alpha')) {
      await alphaPromise; // Intentionally delayed
      return new Response(
        JSON.stringify({
          success: true,
          data: [{ id: 'alpha-1', title: 'Alpha Novel', coverUrl: 'https://alpha.jpg' }],
          error: null,
          meta: { source: 'meionovel', page: 1 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (urlStr.includes('q=beta')) {
      return new Response(
        JSON.stringify({
          success: true,
          data: [{ id: 'beta-1', title: 'Beta Novel', coverUrl: 'https://beta.jpg' }],
          error: null,
          meta: { source: 'meionovel', page: 1 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    throw new Error(`Unexpected URL: ${urlStr}`);
  };

  // User types 'alpha'
  const observerAlpha = new InfiniteQueryObserver(queryClient, {
    queryKey: ['novels', 'search', 'alpha'],
    queryFn: ({ pageParam = 1, signal }) => searchNovels('alpha', pageParam, { signal }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => calculateNextPageParam(lastPage, allPages),
  });
  const subAlpha = observerAlpha.subscribe(() => {});

  // Shortly after, user types 'beta'
  const observerBeta = new InfiniteQueryObserver(queryClient, {
    queryKey: ['novels', 'search', 'beta'],
    queryFn: ({ pageParam = 1, signal }) => searchNovels('beta', pageParam, { signal }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => calculateNextPageParam(lastPage, allPages),
  });
  const subBeta = observerBeta.subscribe(() => {});

  // Wait for 'beta' to complete
  await new Promise((resolve) => {
    const unsubscribe = observerBeta.subscribe((result) => {
      if (result.isSuccess && result.data?.pages?.[0]?.length > 0) {
        unsubscribe();
        resolve();
      }
    });
  });

  assert.strictEqual(observerBeta.getCurrentResult().data.pages[0][0].title, 'Beta Novel');

  // Now, delayed 'alpha' response arrives (transport ignored abort or finished late)
  resolveAlpha();
  await new Promise((r) => setTimeout(r, 40));

  // Verify that Beta result remains strictly 'Beta Novel' and is NOT overwritten
  const betaFinalResult = observerBeta.getCurrentResult();
  assert.strictEqual(betaFinalResult.data.pages[0][0].title, 'Beta Novel');
  assert.strictEqual(betaFinalResult.data.pages[0].length, 1);

  // Verify that UI state resolution with active query 'beta' reflects Beta Novel
  const betaUiState = resolveSearchUiState({
    rawInput: 'beta',
    debouncedQuery: 'beta',
    isLoading: betaFinalResult.isLoading,
    isSuccess: betaFinalResult.isSuccess,
    isError: betaFinalResult.isError,
    error: betaFinalResult.error,
    items: betaFinalResult.data.pages[0],
  });
  assert.strictEqual(betaUiState.type, 'SUCCESS');
  assert.strictEqual(betaUiState.count, 1);

  subAlpha();
  subBeta();
  queryClient.clear();
  console.log('✔ Late response from earlier query ("alpha") never replaces or corrupts active query ("beta")');

} finally {
  globalThis.fetch = originalFetch;
}

// ---------------------------------------------------------------------------
// 6. Cancellation & State Selection (resolveSearchUiState Production Function)
// ---------------------------------------------------------------------------
console.log('\n--- 6. State Selection, Cancellation & Empty State Rigor ---');

// 6.1 Cancellation must NOT be mapped to error banner or empty state
const cancelledError = new AppError('REQUEST_CANCELLED', 'Request dibatalkan oleh pengguna.', 0, null, false);
const cancelledUiState = resolveSearchUiState({
  rawInput: 'test',
  debouncedQuery: 'test',
  isLoading: false,
  isSuccess: false,
  isError: true,
  error: cancelledError,
  items: [],
});

assert.strictEqual(cancelledUiState.type, 'ERROR');
assert.strictEqual(cancelledUiState.isCancelled, true, 'isCancelled must be true for REQUEST_CANCELLED');
assert.notStrictEqual(cancelledUiState.type, 'EMPTY', 'Cancelled request must NEVER be treated as EMPTY state');
console.log('✔ REQUEST_CANCELLED flags isCancelled: true and is strictly prevented from being treated as EMPTY');

// 6.2 Debouncing state takes absolute precedence over old items or old errors
const debouncingUiState = resolveSearchUiState({
  rawInput: 'kim',
  debouncedQuery: 'ki', // rawInput != debouncedQuery -> waiting debounce
  isLoading: false,
  isSuccess: true,
  isError: false,
  error: null,
  items: [{ id: 'old-1', title: 'Old Novel', coverUrl: 'https://old.jpg' }],
});
assert.strictEqual(debouncingUiState.type, 'DEBOUNCING');
assert.strictEqual(debouncingUiState.query, 'kim');
console.log('✔ DEBOUNCING state suppresses old query results and errors while waiting for timer');

// 6.3 Empty state ONLY triggers after successful response with 0 items
const emptyResultUiState = resolveSearchUiState({
  rawInput: 'xyznonexistent',
  debouncedQuery: 'xyznonexistent',
  isLoading: false,
  isSuccess: true,
  isError: false,
  error: null,
  items: [],
});
assert.strictEqual(emptyResultUiState.type, 'EMPTY');
assert.strictEqual(emptyResultUiState.query, 'xyznonexistent');

// Negative control: Pending or initial idle is NOT empty
const pendingUiState = resolveSearchUiState({
  rawInput: 'xyz',
  debouncedQuery: 'xyz',
  isLoading: true, // Still loading
  isSuccess: false,
  isError: false,
  error: null,
  items: [],
});
assert.strictEqual(pendingUiState.type, 'LOADING');
assert.notStrictEqual(pendingUiState.type, 'EMPTY');
console.log('✔ EMPTY state triggers ONLY after successful response with 0 items (never during loading or cancellation)');

// 6.4 Success state with item count: "{count} novel dimuat"
const successUiState = resolveSearchUiState({
  rawInput: 'solo',
  debouncedQuery: 'solo',
  isLoading: false,
  isSuccess: true,
  isError: false,
  error: null,
  items: [
    { id: '1', title: 'Solo 1', coverUrl: '' },
    { id: '2', title: 'Solo 2', coverUrl: '' },
    { id: '3', title: 'Solo 3', coverUrl: '' },
  ],
});
assert.strictEqual(successUiState.type, 'SUCCESS');
assert.strictEqual(successUiState.count, 3);
console.log('✔ SUCCESS state correctly tracks loaded count for "{N} novel dimuat" label');

// ---------------------------------------------------------------------------
// 7. Cache Isolation: Search Queries vs Discover Feed Queries
// ---------------------------------------------------------------------------
console.log('\n--- 7. Cache Isolation: Search Queries vs Discover Feed ---');

const cacheClient = new QueryClient();

// Populate Discover feed cache
cacheClient.setQueryData(['novels', 'popular'], [
  { id: 'pop-1', title: 'Popular Novel 1', coverUrl: 'https://pop.jpg' },
]);
cacheClient.setQueryData(['novels', 'latest'], {
  pages: [[{ id: 'lat-1', title: 'Latest Novel 1', coverUrl: 'https://lat.jpg' }]],
  pageParams: [1],
});

// Populate two separate search queries
cacheClient.setQueryData(['novels', 'search', 'kimi'], {
  pages: [[{ id: 'kimi-1', title: 'Kimi Novel', coverUrl: 'https://kimi.jpg' }]],
  pageParams: [1],
});
cacheClient.setQueryData(['novels', 'search', 'btth'], {
  pages: [[{ id: 'btth-1', title: 'BTTH Novel', coverUrl: 'https://btth.jpg' }]],
  pageParams: [1],
});

// Clear one search query
cacheClient.removeQueries({ queryKey: ['novels', 'search', 'kimi'] });

// Verify 'kimi' is removed
assert.strictEqual(cacheClient.getQueryData(['novels', 'search', 'kimi']), undefined);

// Verify 'btth' is still present
const btthData = cacheClient.getQueryData(['novels', 'search', 'btth']);
assert(btthData && btthData.pages[0][0].title === 'BTTH Novel');

// Verify Discover feed queries are completely untouched and fresh
const popularFeed = cacheClient.getQueryData(['novels', 'popular']);
assert(popularFeed && popularFeed[0].id === 'pop-1');

const latestFeed = cacheClient.getQueryData(['novels', 'latest']);
assert(latestFeed && latestFeed.pages[0][0].id === 'lat-1');

console.log('✔ Cache isolation verified: Clearing search queries does not affect Discover feed queries or sibling searches');
cacheClient.clear();

// ---------------------------------------------------------------------------
// 8. Isolated Search Pagination: P1 OK -> P2 Fail -> P2 Retry OK -> Termination
// ---------------------------------------------------------------------------
console.log('\n--- 8. Search Pagination Lifecycle: P1 Success -> P2 Fail -> P2 Retry Success ---');

try {
  const paginationQueryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  let p2Attempt = 0;
  let shouldRefetchFail = false;

  globalThis.fetch = async (url) => {
    const urlStr = String(url);

    if (urlStr.includes('/api/novels/search') && urlStr.includes('page=1')) {
      if (shouldRefetchFail) {
        return new Response(
          JSON.stringify({
            success: false,
            data: null,
            error: { code: 'PROVIDER_TIMEOUT', message: 'Koneksi upstream terputus saat penyegaran.' },
          }),
          { status: 504, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({
          success: true,
          data: [
            { id: 's-1', title: 'Search Item 1', coverUrl: 'https://s1.jpg' },
            { id: 's-2', title: 'Search Item 2', coverUrl: 'https://s2.jpg' },
          ],
          error: null,
          meta: { source: 'meionovel', page: 1 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (urlStr.includes('/api/novels/search') && urlStr.includes('page=2')) {
      p2Attempt++;
      if (p2Attempt === 1) {
        // First attempt fails (504 Gateway Timeout)
        return new Response(
          JSON.stringify({
            success: false,
            data: null,
            error: { code: 'PROVIDER_TIMEOUT', message: 'Halaman 2 gagal dimuat.' },
          }),
          { status: 504, headers: { 'Content-Type': 'application/json' } }
        );
      }
      // Second attempt (retry) succeeds
      return new Response(
        JSON.stringify({
          success: true,
          data: [
            { id: 's-2', title: 'Search Item 2 (Duplicate)', coverUrl: 'https://s2.jpg' },
            { id: 's-3', title: 'Search Item 3', coverUrl: 'https://s3.jpg' },
          ],
          error: null,
          meta: { source: 'meionovel', page: 2 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (urlStr.includes('/api/novels/search') && urlStr.includes('page=3')) {
      // Page 3 returns [] (Catalog end)
      return new Response(
        JSON.stringify({
          success: true,
          data: [],
          error: null,
          meta: { source: 'meionovel', page: 3 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    throw new Error(`Unexpected URL in pagination test: ${urlStr}`);
  };

  const observer = new InfiniteQueryObserver(paginationQueryClient, {
    queryKey: ['novels', 'search', 'query-lifecycle'],
    queryFn: ({ pageParam = 1, signal }) =>
      searchNovels('query-lifecycle', pageParam, { signal }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => calculateNextPageParam(lastPage, allPages),
  });

  const unsubscribe = observer.subscribe(() => {});

  // 1. Initial Page 1 load
  await new Promise((resolve) => {
    const unsub = observer.subscribe((res) => {
      if (res.isSuccess && res.data?.pages?.length === 1) {
        unsub();
        resolve();
      }
    });
  });

  let currentResult = observer.getCurrentResult();
  let deduplicated = deduplicateNovels(currentResult.data.pages);
  assert.strictEqual(deduplicated.length, 2);
  console.log('✔ Step A: Search Page 1 successfully loaded and cached (2 items)');

  // 2. Fetch Page 2 (Fails with 504)
  await observer.fetchNextPage();

  currentResult = observer.getCurrentResult();
  assert.strictEqual(currentResult.isFetchNextPageError, true, 'isFetchNextPageError must be true on P2 failure');
  assert.strictEqual(currentResult.isRefetchError, false, 'isRefetchError must be false on pagination failure');
  // Crucial: Page 1 items must NOT be lost when Page 2 fails
  deduplicated = deduplicateNovels(currentResult.data.pages);
  assert.strictEqual(deduplicated.length, 2, 'Page 1 items must remain intact when Page 2 fails');

  // Regresi 1: P1 sukses -> P2 gagal: hasil P1 utuh, tanpa banner refresh, retry tetap menuju P2
  const p2FailUiState = resolveSearchUiState({
    rawInput: 'query-lifecycle',
    debouncedQuery: 'query-lifecycle',
    isLoading: currentResult.isLoading,
    isSuccess: currentResult.isSuccess,
    isError: currentResult.isError,
    isRefetchError: currentResult.isRefetchError,
    error: currentResult.error,
    items: deduplicated,
  });
  assert.strictEqual(p2FailUiState.type, 'SUCCESS');
  assert.strictEqual(p2FailUiState.count, 2);
  assert.strictEqual(p2FailUiState.refetchError, null, 'P2 pagination failure must NOT produce a refresh banner');
  assert.strictEqual(currentResult.hasNextPage, true, 'Retry must still target Page 2 (hasNextPage=true)');
  console.log('✔ Step B: P1 success -> P2 fail: P1 items intact, NO refresh banner (isRefetchError=false), retry points to P2');

  // 3. Retry Page 2 (Succeeds)
  await observer.fetchNextPage();

  currentResult = observer.getCurrentResult();
  assert.strictEqual(currentResult.isFetchNextPageError, false);
  assert.strictEqual(currentResult.data.pages.length, 2);
  deduplicated = deduplicateNovels(currentResult.data.pages);
  assert.strictEqual(deduplicated.length, 3, 'Page 1 and Page 2 merged and deduplicated (s-1, s-2, s-3)');
  assert.deepStrictEqual(
    deduplicated.map((n) => n.id),
    ['s-1', 's-2', 's-3']
  );
  console.log('✔ Step C: Search Page 2 retry succeeds; Page 1 and 2 merged and deduplicated');

  // Regresi 2: Refetch gagal setelah data tersedia -> banner refresh muncul
  shouldRefetchFail = true;
  await observer.refetch();

  currentResult = observer.getCurrentResult();
  assert.strictEqual(currentResult.isRefetchError, true, 'isRefetchError must be true on failed refetch');
  assert.strictEqual(currentResult.isFetchNextPageError, false, 'isFetchNextPageError must be false on refetch failure');
  deduplicated = deduplicateNovels(currentResult.data.pages);
  assert.strictEqual(deduplicated.length, 3, 'Previous items remain in cache after failed refetch');

  const refetchFailUiState = resolveSearchUiState({
    rawInput: 'query-lifecycle',
    debouncedQuery: 'query-lifecycle',
    isLoading: currentResult.isLoading,
    isSuccess: currentResult.isSuccess,
    isError: currentResult.isError,
    isRefetchError: currentResult.isRefetchError,
    error: currentResult.error,
    items: deduplicated,
  });
  assert.strictEqual(refetchFailUiState.type, 'SUCCESS');
  assert.strictEqual(refetchFailUiState.count, 3);
  assert(
    refetchFailUiState.refetchError !== null && refetchFailUiState.refetchError.includes('terputus saat penyegaran'),
    'Refresh banner MUST appear when isRefetchError=true'
  );
  console.log('✔ Step C.1: Refetch failure after data available: isRefetchError=true, refresh banner appears');

  // Regresi 3: Assertion pembatalan pada helper resolveSearchUiState -> tidak memunculkan banner refresh
  const cancelledRefetchError = new AppError('REQUEST_CANCELLED', 'Operasi dibatalkan.', 0, null, false);
  const cancelledUiState = resolveSearchUiState({
    rawInput: 'query-lifecycle',
    debouncedQuery: 'query-lifecycle',
    isLoading: false,
    isSuccess: false,
    isError: true,
    isRefetchError: true,
    error: cancelledRefetchError,
    items: deduplicated,
  });
  assert.strictEqual(cancelledUiState.type, 'SUCCESS');
  assert.strictEqual(cancelledUiState.refetchError, null, 'Cancellation must NOT produce refresh banner');
  console.log('✔ Step C.2: Helper assertion: cancellation error suppresses refresh banner (refetchError=null)');

  // Pulihkan kondisi fetch untuk melanjutkan ke Step D
  shouldRefetchFail = false;
  await observer.refetch();

  // 4. Fetch Page 3 (Empty array -> EXHAUSTED)
  await observer.fetchNextPage();

  currentResult = observer.getCurrentResult();
  assert.strictEqual(currentResult.data.pages.length, 3);
  const nextParam = calculateNextPageParam(
    currentResult.data.pages[2],
    currentResult.data.pages
  );
  assert.strictEqual(nextParam, undefined, 'Empty page must return undefined next page param');

  const endReason = evaluateFeedEndReason(currentResult.data.pages);
  assert.strictEqual(endReason, 'EXHAUSTED');
  assert.strictEqual(getSearchEndMessage(endReason), 'Semua hasil pencarian telah dimuat.');
  console.log('✔ Step D: Empty page terminates pagination with "EXHAUSTED" and message "Semua hasil pencarian telah dimuat."');

  // 5. Test loop prevention end message
  const noNewItemsReason = evaluateFeedEndReason([
    [{ id: 'item-1', title: 'Item 1', coverUrl: '' }],
    [{ id: 'item-1', title: 'Item 1 Dupe', coverUrl: '' }],
  ]);
  assert.strictEqual(noNewItemsReason, 'NO_NEW_ITEMS');
  assert.strictEqual(getSearchEndMessage(noNewItemsReason), 'Tidak ada hasil novel baru.');
  console.log('✔ Step E: Duplicate-only page terminates auto-fetch with "NO_NEW_ITEMS" and message "Tidak ada hasil novel baru."');

  unsubscribe();
  paginationQueryClient.clear();

} finally {
  globalThis.fetch = originalFetch;
}

// ---------------------------------------------------------------------------
// 9. Search Refetch Failure, Cancellation Hygiene & Error Isolation Regressions
// ---------------------------------------------------------------------------
console.log('\n--- 9. Search Refetch Failure, Cancellation & Keyword Error Isolation ---');

try {
  const refetchClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  let shouldRefetchFail = false;

  globalThis.fetch = async (url) => {
    const urlStr = String(url);
    if (urlStr.includes('/api/novels/search') && urlStr.includes('q=refetch-test')) {
      if (shouldRefetchFail) {
        return new Response(
          JSON.stringify({
            success: false,
            data: null,
            error: { code: 'PROVIDER_TIMEOUT', message: 'Koneksi upstream terputus saat penyegaran.' },
          }),
          { status: 504, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({
          success: true,
          data: [
            { id: 'rf-1', title: 'Refetch Novel 1', coverUrl: 'https://rf1.jpg' },
            { id: 'rf-2', title: 'Refetch Novel 2', coverUrl: 'https://rf2.jpg' },
          ],
          error: null,
          meta: { source: 'meionovel', page: 1 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    throw new Error(`Unexpected URL: ${urlStr}`);
  };

  const observer = new InfiniteQueryObserver(refetchClient, {
    queryKey: ['novels', 'search', 'refetch-test'],
    queryFn: ({ pageParam = 1, signal }) =>
      searchNovels('refetch-test', pageParam, { signal }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => calculateNextPageParam(lastPage, allPages),
  });

  const unsub = observer.subscribe(() => {});

  // 1. Initial successful search
  await new Promise((resolve) => {
    const s = observer.subscribe((res) => {
      if (res.isSuccess && res.data?.pages?.length === 1) {
        s();
        resolve();
      }
    });
  });

  let currentRes = observer.getCurrentResult();
  let items = deduplicateNovels(currentRes.data.pages);
  assert.strictEqual(items.length, 2);

  let uiState = resolveSearchUiState({
    rawInput: 'refetch-test',
    debouncedQuery: 'refetch-test',
    isLoading: currentRes.isLoading,
    isSuccess: currentRes.isSuccess,
    isError: currentRes.isError,
    isRefetchError: currentRes.isRefetchError,
    error: currentRes.error,
    items,
  });
  assert.strictEqual(uiState.type, 'SUCCESS');
  assert.strictEqual(uiState.refetchError, null);

  // 2. Refetch fails (504): old data MUST remain intact, refetchError MUST be populated
  shouldRefetchFail = true;
  await observer.refetch();

  currentRes = observer.getCurrentResult();
  assert.strictEqual(currentRes.isError, true, 'Observer reports error after failed refetch');
  assert.strictEqual(currentRes.isRefetchError, true, 'isRefetchError must be true on failed refetch');
  items = deduplicateNovels(currentRes.data.pages);
  assert.strictEqual(items.length, 2, 'Previous 2 items MUST remain completely intact in cache');

  uiState = resolveSearchUiState({
    rawInput: 'refetch-test',
    debouncedQuery: 'refetch-test',
    isLoading: currentRes.isLoading,
    isSuccess: currentRes.isSuccess,
    isError: currentRes.isError,
    isRefetchError: currentRes.isRefetchError,
    error: currentRes.error,
    items,
  });
  assert.strictEqual(uiState.type, 'SUCCESS', 'UI State remains SUCCESS to keep previous results displayed');
  assert.strictEqual(uiState.count, 2);
  assert(
    uiState.refetchError !== null && uiState.refetchError.includes('terputus saat penyegaran'),
    'refetchError must contain the specific error message for small banner display'
  );
  console.log('✔ Search refetch failure: previous data remains displayed and refetchError is populated for small banner');

  // 3. User taps "Coba Lagi" (retry refetch): succeeds
  shouldRefetchFail = false;
  await observer.refetch();

  currentRes = observer.getCurrentResult();
  assert.strictEqual(currentRes.isError, false);
  assert.strictEqual(currentRes.isRefetchError, false);
  items = deduplicateNovels(currentRes.data.pages);
  assert.strictEqual(items.length, 2);

  uiState = resolveSearchUiState({
    rawInput: 'refetch-test',
    debouncedQuery: 'refetch-test',
    isLoading: currentRes.isLoading,
    isSuccess: currentRes.isSuccess,
    isError: currentRes.isError,
    isRefetchError: currentRes.isRefetchError,
    error: currentRes.error,
    items,
  });
  assert.strictEqual(uiState.type, 'SUCCESS');
  assert.strictEqual(uiState.refetchError, null, 'refetchError must be cleared after successful retry');
  console.log('✔ Successful retry of search refetch clears refetchError');

  // 4. Cancellation during refetch MUST NOT trigger error banner
  const cancelledRefetchError = new AppError('REQUEST_CANCELLED', 'Operasi dibatalkan.', 0, null, false);
  const cancelledRefetchUiState = resolveSearchUiState({
    rawInput: 'refetch-test',
    debouncedQuery: 'refetch-test',
    isLoading: false,
    isSuccess: false,
    isError: true,
    isRefetchError: true,
    error: cancelledRefetchError,
    items,
  });
  assert.strictEqual(cancelledRefetchUiState.type, 'SUCCESS');
  assert.strictEqual(cancelledRefetchUiState.refetchError, null, 'REQUEST_CANCELLED must NOT populate refetchError banner');
  console.log('✔ Cancellation during refetch suppresses refetchError banner and retains previous data');

  // 5. Keyword error isolation: error on previous keyword does NOT leak to new keyword or Home
  // Scenario A: User types new keyword "new-novel" -> debouncing state has NO error
  const newKeywordDebouncingUiState = resolveSearchUiState({
    rawInput: 'new-novel',
    debouncedQuery: 'refetch-test', // Still different -> debouncing
    isLoading: false,
    isSuccess: false,
    isError: true, // Leftover error from refetch-test
    error: currentRes.error,
    items: [],
  });
  assert.strictEqual(newKeywordDebouncingUiState.type, 'DEBOUNCING');
  assert.strictEqual(newKeywordDebouncingUiState.query, 'new-novel');

  // Scenario B: After debounce commits "new-novel", its query state is fresh (no error)
  const newKeywordFreshUiState = resolveSearchUiState({
    rawInput: 'new-novel',
    debouncedQuery: 'new-novel',
    isLoading: true, // Loading new keyword
    isSuccess: false,
    isError: false,
    error: null,
    items: [],
  });
  assert.strictEqual(newKeywordFreshUiState.type, 'LOADING');

  // Scenario C: Clearing back to Beranda (rawInput = '') immediately returns IDLE without error
  const homeReturnUiState = resolveSearchUiState({
    rawInput: '',
    debouncedQuery: '',
    isLoading: false,
    isSuccess: false,
    isError: true, // Any leftover error from prior query
    error: currentRes.error,
    items: [],
  });
  assert.strictEqual(homeReturnUiState.type, 'IDLE', 'Returning to Home immediately yields IDLE without leaking query error');
  console.log('✔ Keyword error isolation: prior keyword error never leaks to new keyword or Home screen');

  unsub();
  refetchClient.clear();

} finally {
  globalThis.fetch = originalFetch;
}

// ---------------------------------------------------------------------------
// 10. Verification Boundaries & Android Runtime Distinction
// ---------------------------------------------------------------------------
console.log('\n--- 10. Verification Boundaries & Pending Android Runtime Items ---');
console.log('Automated & Mock Tests Confirmed (Node.js Logic):');
console.log('  [PASS] Shared validatePageParam strictly rejecting non-safe positive integers (regressions on getLatestNovels & searchNovels)');
console.log('  [PASS] URL encoding of special characters (&, +, spaces, Unicode) and preservation of letter case');
console.log('  [PASS] Rapid keystrokes debouncing via production SearchDebounceManager (only final keyword committed)');
console.log('  [PASS] Instant synchronous reset on empty / whitespace input without delay');
console.log('  [PASS] Clear button cancelling active timer and preventing late response from re-entering search mode');
console.log('  [PASS] Late response race condition: delayed "alpha" response never replaces or corrupts active "beta" query');
console.log('  [PASS] REQUEST_CANCELLED suppressed from error banner and strictly prohibited from triggering EMPTY state');
console.log('  [PASS] EMPTY state triggers exclusively after successful HTTP 200 response with [] on Page 1');
console.log('  [PASS] Cache isolation: Search queries completely isolated from Discover feed queries and sibling queries');
console.log('  [PASS] Full pagination cycle: P1 OK -> P2 Fail (P1 retained) -> P2 Retry OK -> Termination (EXHAUSTED / NO_NEW_ITEMS)');
console.log('  [PASS] Search refetch failure with data retention and small banner notification with "Coba Lagi" action');
console.log('  [PASS] Helper resolveSearchUiState cancellation suppression: REQUEST_CANCELLED prevents error/banner');
console.log('  [PASS] Keyword error isolation: query errors never leak across different keywords or to Home screen');

console.log('\n[CRITICAL BOUNDARY NOTICE]');
console.log('Pengujian di atas adalah verifikasi logika fungsi, isolasi cache, dan query observer');
console.log('pada level JavaScript/Node.js. Pengujian ini BUKAN bukti render tata letak visual di layar,');
console.log('eksekusi runtime Hermes di perangkat, atau responsivitas sentuhan pada perangkat fisik Android.');

console.log('\nThe following runtime behaviors CANNOT be verified in Node or static Hermes compilation');
console.log('and REMAIN PENDING until real Android hardware / emulator verification:');
console.log('  [PENDING] Android soft keyboard emergence, layout insets, and single-tap responsiveness with keyboard open (keyboardShouldPersistTaps="handled")');
console.log('  [PENDING] Physical Android hardware Back button precedence (close keyboard -> clear search -> navigate back)');
console.log('  [PENDING] Physical touch target clearance for 24dp search/close icons and 48dp clear button on small (320dp) screens');
console.log('  [PENDING] Visual non-clipping of enlarged text under extreme Android font scale multipliers (e.g. 1.5x - 2.0x)');
console.log('  [PENDING] Android TalkBack accessibility announcements for search bar input and theme cycling button');

console.log('\n=== ALL NOVEL SEARCH CHECKS PASSED ===\n');
