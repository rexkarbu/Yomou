---
name: scraper-resilience
description: "Web scraping resilience, anti-fragility, and fault-tolerance patterns for AI coding agents. Covers retry schedules with exponential backoff, DOM drift handling with cascading Cheerio selectors, network timeouts, empty content validation, anti-bot evasion headers, ContentBlock normalization, and in-memory caching. Use whenever writing, refactoring, or reviewing web scrapers, crawler engines, HTML extractors, or proxy microservices."
license: MIT
metadata:
  version: v1
  category: scraping
---

# Scraper Resilience

Resilient web scraping is an **engineering discipline**, not just query-selector matching. Upstream websites change markup (DOM drift), deploy bot protection, suffer server latency, return blank pages on soft-bans, or rate limit aggressive scrapers.

When implementing or reviewing any scraper, crawler, or scraping proxy service, follow this guide to build scrapers that survive production turbulence.

---

## 1. Network Hardening & Timeouts

### 1.1 Strict Timeout Enforcing
Never allow a scraping request to hang indefinitely. Node.js `fetch` or `axios` default timeouts can stall backend workers and exhaust connection pools.
- **Rule**: Every outbound fetch MUST enforce a hard timeout using `AbortController` (default limit: **8,000 ms**).
- If the timeout triggers, abort the connection and map it to an explicit error code: `PROVIDER_TIMEOUT`.

```typescript
export async function resilientFetch(url: string, options: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error: any) {
    if (error.name === 'AbortError' || controller.signal.aborted) {
      throw new ScraperError('PROVIDER_TIMEOUT', `Upstream request timed out after ${timeoutMs}ms: ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
```

### 1.2 Header Hygiene & Anti-Bot Evasion
Never send default bot headers (`node-fetch`, `axios`, `python-requests`, or blank `User-Agent`).
- Mimic genuine modern browsers with consistent headers:
  - `User-Agent`: Modern Chrome/Safari on Windows/macOS.
  - `Accept`: `text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8`
  - `Accept-Language`: `en-US,en;q=0.9,id;q=0.8` (or match target site locale).
  - `Accept-Encoding`: `gzip, deflate, br`
  - `Cache-Control`: `no-cache`
  - `Sec-Ch-Ua`, `Sec-Ch-Ua-Mobile`, `Sec-Fetch-Dest`, `Sec-Fetch-Mode`, `Sec-Fetch-Site`
- Maintain referer consistency:
  - When requesting chapter content, pass the novel detail page URL as the `Referer`.
  - When requesting feeds, pass the site root URL.

---

## 2. Retry Logic & Backoff Schedules

### 2.1 The Retry Matrix
Do not blindly retry all failed requests. Categorize errors into **retriable** and **fatal**:

| HTTP Status / Error | Classification | Action |
| :--- | :--- | :--- |
| `ECONNRESET`, `ETIMEDOUT`, `EAI_AGAIN` | Retriable | Retry with backoff schedule |
| `429 Too Many Requests` | Retriable | Respect `Retry-After` header; else exponential backoff |
| `500`, `502`, `503`, `504` Server Error | Retriable | Retry with backoff schedule |
| `400 Bad Request`, `404 Not Found` | Fatal (Non-retriable) | Fail fast, do not retry |
| `401 Unauthorized`, `403 Forbidden` | Fatal / Anti-bot | Trigger IP/Proxy rotation or alert `PROVIDER_BLOCKED` |

### 2.2 Standard Backoff Schedule
The standard retry schedule is:
- **1 initial attempt + 3 retries** (total 4 attempts)
- **Delays**: 2s, 5s, 10s (with ±20% randomized jitter to prevent thundering herds).

```typescript
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delays = [2000, 5000, 10000]
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      if (attempt > maxRetries || !isRetriableError(error)) {
        throw error;
      }
      const baseDelay = delays[attempt - 1] ?? 10000;
      const jitter = baseDelay * 0.2 * (Math.random() * 2 - 1);
      const delay = Math.round(baseDelay + jitter);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

---

## 3. DOM Drift Resilience (Selector Cascading)

Websites change templates, themes, and CSS classes without notice. Brittle scrapers fail on the first CSS rename.

### 3.1 Cascading Selectors Pattern
Never use a single selector for critical elements. Provide a cascading fallback list ordered by preference:

```typescript
const CHAPTER_CONTENT_SELECTORS = [
  '.entry-content',            // Standard WordPress
  '.chapter-content',          // Common novel reader theme
  '#chapter-content',          // ID fallback
  '.read-content',             // Alternative reader layout
  'article .content',          // Semantic fallback
  '.text-left',                // Secondary wrapper
  'div[itemprop="articleBody"]' // Microdata fallback
];

export function extractWithFallback($: cheerio.CheerioAPI, selectors: string[]): cheerio.Cheerio<cheerio.Element> {
  for (const selector of selectors) {
    const el = $(selector);
    if (el.length > 0 && el.text().trim().length > 50) {
      return el;
    }
  }
  throw new ScraperError('SCRAPER_PARSE_ERROR', `None of the candidate selectors matched valid content: [${selectors.join(', ')}]`);
}
```

### 3.2 Drift Telemetry
When a fallback selector is used instead of the primary selector:
- Log a warning with structured metadata: `[DOM_DRIFT] Primary selector '${selectors[0]}' failed, succeeded with fallback '${matchedSelector}'`.
- This alerts developers to update the selector before the fallback breaks too.

---

## 4. Anomaly Guards & Empty Content Protection

### 4.1 Empty Content Validation
Many anti-bot mechanisms or broken upstream pages return an HTTP `200 OK` status with:
- A Cloudflare captcha challenge page
- An empty template container
- A generic error page ("Novel not found / under maintenance")
- Blank whitespace

**Guards**:
1. Validate total HTML size (`> 500 bytes`).
2. Detect common challenge markers (`cf-browser-verification`, `hcaptcha`, `recaptcha`).
3. Check extracted text length: A chapter with `< 100 characters` or `0 content blocks` MUST NOT be treated as valid data.
4. Throw `CHAPTER_EMPTY_CONTENT` (HTTP 422 Unprocessable Entity) to prevent storing corrupt/blank chapters into offline storage or database caches.

---

## 5. Sanitization & Normalization (`ContentBlock[]`)

Never return raw scraped HTML to the frontend client or mobile app. Untrusted HTML causes XSS vulnerabilities, layout breaks, and font glitches.

### 5.1 Tag Whitelisting & Conversion
Strip everything outside safe structural elements:
- Allowed elements:
  - Paragraphs (`<p>`) -> `{ type: 'paragraph', text: '...' }`
  - Headings (`<h1>` - `<h6>`) -> `{ type: 'heading', level: 1-6, text: '...' }`
  - Images (`<img>`) -> `{ type: 'image', url: '...', caption?: '...' }`
  - Blockquotes (`<blockquote>`) -> `{ type: 'quote', text: '...' }`
  - Lists (`<ul>`, `<ol>`) -> `{ type: 'list', items: ['...'] }`
  - Dividers (`<hr>`) -> `{ type: 'separator' }`
- **Strip unconditionally**: `<script>`, `<style>`, `<iframe>`, `<form>`, `<svg>`, `<button>`, inline attributes (`onclick`, `style`, `class`, `id`), ads wrappers (`.ad-container`, `.adsbygoogle`, `.sharedaddy`).

### 5.2 Image Normalization
- Resolve relative image URLs (`/wp-content/...`) to absolute URLs against the upstream base domain.
- Verify image protocol is `https://` or `http://`.
- Filter out tracking pixels, ad banners, and base64 spacer GIFs.

---

## 6. Caching & Request Throttling

### 6.1 In-Memory LRU Cache
Use a dual-tier or single-tier LRU cache (`lru-cache`) to reduce load on the upstream site and provide fast response times:
- **Feeds (Latest updates, popular)**: TTL 5–15 minutes (frequently changing).
- **Novel Details & Metadata**: TTL 1–2 hours.
- **Chapter Content**: TTL 24–72 hours (or permanent immutable cache). Chapters are static once published.
- **Cache Size Limit**: Bound by memory (e.g. max 500 items or 100 MB) to prevent OOM.

### 6.2 Rate Limiting
- Impose a minimum inter-request delay (e.g., 200–500ms) per upstream domain.
- Never spawn unbounded `Promise.all` scraping hundreds of chapters simultaneously; use a concurrency pool (max concurrency 3–5).

---

## 7. Standard Scraper Error Taxonomy

Always map runtime scraping failures to standard, unambiguous error codes:

| Error Code | HTTP Status | Description |
| :--- | :--- | :--- |
| `PROVIDER_TIMEOUT` | 504 Gateway Timeout | Upstream host failed to respond within timeout window (8s). |
| `PROVIDER_BLOCKED` | 502 / 503 Bad Gateway | Upstream returned 403, Cloudflare turnstile, or captcha challenge. |
| `SCRAPER_PARSE_ERROR` | 500 Internal Server Error | HTML structure changed; no fallback selectors matched. |
| `CHAPTER_EMPTY_CONTENT` | 422 Unprocessable Entity | Extracted chapter body contains zero valid blocks or text. |
| `PROVIDER_NOT_FOUND` | 404 Not Found | Upstream returned 404 for requested novel or chapter slug. |
| `NETWORK_UNREACHABLE` | 502 Bad Gateway | Upstream DNS failure or host unreachable. |

---

## 8. Resilience Verification Checklist

Before deploying any scraper code, verify:
- [ ] Hard timeout enforced on all requests with `AbortController` (<= 8s).
- [ ] User-Agent and browser headers are realistic and non-default.
- [ ] Retries implemented with exponential backoff and jitter for transient errors.
- [ ] No retries on 404 or 400.
- [ ] At least 2–3 cascading fallback selectors for every extracted data field.
- [ ] Warning logged on fallback selector match (DOM drift alert).
- [ ] Empty content guard throws `CHAPTER_EMPTY_CONTENT` on blank/stub chapters.
- [ ] Raw HTML converted to clean, safe `ContentBlock[]` format.
- [ ] Relative image URLs resolved to absolute URLs.
- [ ] Caching layer prevents duplicate requests to upstream servers.
- [ ] Request concurrency capped (no unbounded parallel fetches).
