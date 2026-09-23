/**
 * Resilient HTTP Client Service with Axios
 * Strictly compliant with PRD Section 3.1 & 9.2 (SLA-NAV-03) and scraper-resilience guidelines
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, isAxiosError } from 'axios';
import { ProviderError } from '../errors/provider.error.js';

export interface HttpClientConfig {
  /** Hard timeout per individual attempt in milliseconds (default: 8000ms) */
  perAttemptTimeoutMs?: number;
  /** Total operation deadline in milliseconds including all retries & delays (default: 8000ms per PRD SLA-NAV-03) */
  totalTimeoutMs?: number;
  /** Maximum number of retries after initial attempt (default: 3) */
  maxRetries?: number;
  /** Backoff delay schedule in milliseconds (default: [2000, 5000, 10000] per tasks.md) */
  retryDelays?: number[];
  /** Default request headers */
  defaultHeaders?: Record<string, string>;
  /** Optional callback fired on each retry attempt */
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void;
}

export interface RequestOptions extends AxiosRequestConfig {
  /** Hard timeout per individual attempt in milliseconds (default: 8000ms) */
  perAttemptTimeoutMs?: number;
  /** Total operation deadline in milliseconds including all retries & delays (default: 8000ms per PRD SLA-NAV-03) */
  totalTimeoutMs?: number;
  /** Maximum number of retries after initial attempt (default: 3) */
  maxRetries?: number;
  /** Backoff delay schedule in milliseconds (default: [2000, 5000, 10000]) */
  retryDelays?: number[];
  /** Optional callback fired on each retry attempt */
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void;
  /** Explicitly allow/disallow retries (default: true for GET, false for POST) */
  allowRetry?: boolean;
}

export interface HttpResponse<T = string> {
  data: T;
  status: number;
  headers: Record<string, string | string[]>;
}

export const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';

export const DEFAULT_HEADERS: Record<string, string> = {
  'User-Agent': DEFAULT_USER_AGENT,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Sec-Ch-Ua': '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
};

const RETRIABLE_NETWORK_CODES = new Set([
  'ECONNRESET',
  'ETIMEDOUT',
  'ECONNABORTED',
  'EAI_AGAIN',
  'ENOTFOUND',
  'ECONNREFUSED',
  'ERR_NETWORK',
  'ERR_BAD_RESPONSE',
]);

const RETRIABLE_HTTP_STATUSES = new Set([429, 500, 502, 503, 504]);

/**
 * Checks if an error is retriable (network connection drop, timeout, or 5xx / 429)
 */
export function isRetriableError(error: unknown): boolean {
  if (!isAxiosError(error)) {
    return false;
  }

  // Network / Socket / Timeout errors
  if (error.code && RETRIABLE_NETWORK_CODES.has(error.code)) {
    return true;
  }

  // Message based timeout detection
  if (error.message && error.message.toLowerCase().includes('timeout')) {
    return true;
  }

  // Server error statuses (5xx and 429)
  if (error.response?.status && RETRIABLE_HTTP_STATUSES.has(error.response.status)) {
    return true;
  }

  return false;
}

/**
 * Parses the Retry-After header according to RFC 7231 Section 7.1.3 / RFC 2616.
 * Supports:
 * 1. Non-negative integer seconds ("120", "0", "1")
 * 2. RFC 7231 HTTP-date ("Wed, 21 Oct 2026 07:28:00 GMT")
 * Rejects negative numbers ("-1"), fractions ("1.5"), and invalid strings by returning null
 * so callers can safely fall back to the standard retry schedule.
 */
export function parseRetryAfter(headerValue: string | string[] | undefined): number | null {
  if (!headerValue) return null;
  const raw = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  if (!raw || typeof raw !== 'string') return null;

  const trimmed = raw.trim();

  // 1. Non-negative integer seconds: purely digits (e.g. "0", "1", "120")
  if (/^\d+$/.test(trimmed)) {
    const seconds = parseInt(trimmed, 10);
    return Number.isSafeInteger(seconds) && seconds >= 0 ? seconds * 1000 : null;
  }

  // 2. HTTP-date: RFC 7231 / RFC 2616 format starts with day of week (e.g. "Wed, 21 Oct 2026 07:28:00 GMT")
  // Reject negative numbers ("-1"), fractions ("1.5"), or non-date strings before passing to Date.parse
  if (!/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)/i.test(trimmed)) {
    return null;
  }

  const parsedDate = Date.parse(trimmed);
  if (!isNaN(parsedDate)) {
    const delayMs = parsedDate - Date.now();
    return Math.max(0, delayMs);
  }

  return null;
}

/**
 * Sleep helper that respects an AbortSignal to cancel waiting immediately
 */
export function sleepWithSignal(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(signal.reason ?? new Error('Aborted'));
    }

    const timer = setTimeout(() => {
      if (signal) {
        signal.removeEventListener('abort', onAbort);
      }
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason ?? new Error('Aborted'));
    };

    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}

export function mapAxiosErrorToProviderError(
  error: unknown,
  url: string,
  attempts: number,
  perAttemptTimeoutMs: number,
  totalTimeoutMs: number,
  isTotalDeadlineExceeded = false
): ProviderError {
  if (isTotalDeadlineExceeded) {
    return new ProviderError(
      'PROVIDER_TIMEOUT',
      `Total operation deadline of ${totalTimeoutMs}ms exceeded: ${url}`,
      504,
      { url, attempts, totalTimeoutMs, perAttemptTimeoutMs }
    );
  }

  if (isAxiosError(error)) {
    const status = error.response?.status;
    const code = error.code;
    const isTimeout =
      code === 'ECONNABORTED' ||
      code === 'ETIMEDOUT' ||
      (error.message && error.message.toLowerCase().includes('timeout'));

    if (isTimeout) {
      return new ProviderError(
        'PROVIDER_TIMEOUT',
        `Upstream request timed out after ${perAttemptTimeoutMs}ms: ${url}`,
        504,
        { url, attempts, perAttemptTimeoutMs, totalTimeoutMs, originalError: error.message }
      );
    }

    if (status === 404) {
      return new ProviderError(
        'PROVIDER_NOT_FOUND',
        `Upstream resource not found (404): ${url}`,
        404,
        { url, attempts }
      );
    }

    if (status === 403 || status === 401) {
      return new ProviderError(
        'PROVIDER_BLOCKED',
        `Upstream access blocked or challenge encountered (${status}): ${url}`,
        503,
        { url, status, attempts }
      );
    }

    if (status === 429) {
      return new ProviderError(
        'PROVIDER_BLOCKED',
        `Upstream rate limit exceeded (429): ${url}`,
        503,
        { url, status, attempts }
      );
    }

    if (code && RETRIABLE_NETWORK_CODES.has(code)) {
      return new ProviderError(
        'NETWORK_UNREACHABLE',
        `Upstream network unreachable (${code}): ${url}`,
        502,
        { url, code, attempts, originalError: error.message }
      );
    }

    return new ProviderError(
      'NETWORK_UNREACHABLE',
      error.message || `Upstream request failed: ${url}`,
      status ?? 502,
      { url, attempts, status, originalError: error.message }
    );
  }

  if (error instanceof ProviderError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);
  return new ProviderError('INTERNAL_SERVER_ERROR', message, 500, { url, attempts });
}

export class ResilientHttpClient {
  private readonly client: AxiosInstance;
  public readonly defaultPerAttemptTimeoutMs: number;
  public readonly defaultTotalTimeoutMs: number;
  public readonly defaultMaxRetries: number;
  public readonly defaultRetryDelays: number[];
  private readonly defaultOnRetry?: (attempt: number, error: unknown, delayMs: number) => void;

  constructor(config: HttpClientConfig = {}) {
    this.defaultPerAttemptTimeoutMs = config.perAttemptTimeoutMs ?? 8000;
    this.defaultTotalTimeoutMs = config.totalTimeoutMs ?? 8000;
    this.defaultMaxRetries = config.maxRetries ?? 3;
    // Default schedule strictly 2s, 5s, 10s per tasks.md (without jitter)
    this.defaultRetryDelays = config.retryDelays ?? [2000, 5000, 10000];
    this.defaultOnRetry = config.onRetry;

    this.client = axios.create({
      headers: {
        ...DEFAULT_HEADERS,
        ...(config.defaultHeaders ?? {}),
      },
      validateStatus: (status) => status >= 200 && status < 300,
    });
  }

  private async executeRequest<T = string>(
    method: 'GET' | 'POST',
    url: string,
    data?: unknown,
    options: RequestOptions = {}
  ): Promise<HttpResponse<T>> {
    const perAttemptTimeoutMs = options.perAttemptTimeoutMs ?? this.defaultPerAttemptTimeoutMs;
    const totalTimeoutMs = options.totalTimeoutMs ?? this.defaultTotalTimeoutMs;
    const maxRetries = options.maxRetries ?? this.defaultMaxRetries;
    const retryDelays = options.retryDelays ?? this.defaultRetryDelays;
    const onRetry = options.onRetry ?? this.defaultOnRetry;
    const allowRetry = options.allowRetry ?? (method === 'GET');

    const startTime = Date.now();
    const deadline = startTime + totalTimeoutMs;

    // Overall operation AbortController
    const overallController = new AbortController();
    const totalDeadlineTimer = setTimeout(() => {
      overallController.abort(new Error(`Total operation deadline exceeded (${totalTimeoutMs}ms)`));
    }, totalTimeoutMs);

    let attempt = 0;

    try {
      while (true) {
        attempt++;
        const remainingTotalMs = deadline - Date.now();

        if (remainingTotalMs <= 0 || overallController.signal.aborted) {
          throw new ProviderError(
            'PROVIDER_TIMEOUT',
            `Total operation deadline of ${totalTimeoutMs}ms exceeded before attempt ${attempt}: ${url}`,
            504,
            { url, attempts: attempt - 1, totalTimeoutMs, perAttemptTimeoutMs }
          );
        }

        // Each individual attempt's timeout cannot exceed the remaining time to overall deadline
        const currentAttemptTimeout = Math.min(perAttemptTimeoutMs, remainingTotalMs);

        // Per-attempt AbortController linked with overallController
        const attemptController = new AbortController();
        const onOverallAbort = () => {
          attemptController.abort(overallController.signal.reason);
        };
        overallController.signal.addEventListener('abort', onOverallAbort, { once: true });

        try {
          const response: AxiosResponse<T> = await this.client.request<T>({
            ...options,
            method,
            url,
            data,
            timeout: currentAttemptTimeout,
            signal: attemptController.signal,
          });

          return {
            data: response.data,
            status: response.status,
            headers: response.headers as Record<string, string | string[]>,
          };
        } catch (error: unknown) {
          overallController.signal.removeEventListener('abort', onOverallAbort);

          const isTotalDeadlineExceeded = overallController.signal.aborted || Date.now() >= deadline;
          if (isTotalDeadlineExceeded) {
            throw mapAxiosErrorToProviderError(error, url, attempt, perAttemptTimeoutMs, totalTimeoutMs, true);
          }

          const canRetry = allowRetry && attempt <= maxRetries && isRetriableError(error);
          if (!canRetry) {
            throw mapAxiosErrorToProviderError(error, url, attempt, perAttemptTimeoutMs, totalTimeoutMs, false);
          }

          // Calculate delayMs, respecting Retry-After for 429 responses
          let delayMs: number;
          if (isAxiosError(error) && error.response?.status === 429) {
            const parsedRetryAfter = parseRetryAfter(error.response.headers['retry-after']);
            if (parsedRetryAfter !== null) {
              delayMs = parsedRetryAfter;
            } else {
              // Header invalid or missing -> fallback to standard schedule
              delayMs = retryDelays[attempt - 1] ?? retryDelays[retryDelays.length - 1] ?? 10000;
            }
          } else {
            // Standard backoff schedule without jitter (2s, 5s, 10s)
            delayMs = retryDelays[attempt - 1] ?? retryDelays[retryDelays.length - 1] ?? 10000;
          }

          const sisaMs = deadline - Date.now();
          if (delayMs > sisaMs) {
            // If Retry-After or retry delay exceeds deadline -> stop structured without retrying
            if (isAxiosError(error) && error.response?.status === 429) {
              throw new ProviderError(
                'PROVIDER_BLOCKED',
                `Rate limit (429) Retry-After (${delayMs}ms) exceeds remaining operation deadline (${sisaMs}ms): ${url}`,
                503,
                { url, attempts: attempt, retryAfterMs: delayMs, remainingMs: sisaMs, status: 429 }
              );
            }

            throw new ProviderError(
              'PROVIDER_TIMEOUT',
              `Total operation deadline of ${totalTimeoutMs}ms exceeded before retry attempt ${attempt + 1}: ${url}`,
              504,
              { url, attempts: attempt, totalTimeoutMs, requiredDelayMs: delayMs, remainingMs: sisaMs }
            );
          }

          if (onRetry) {
            onRetry(attempt, error, delayMs);
          }

          try {
            await sleepWithSignal(delayMs, overallController.signal);
          } catch {
            throw new ProviderError(
              'PROVIDER_TIMEOUT',
              `Total operation deadline of ${totalTimeoutMs}ms exceeded during retry delay: ${url}`,
              504,
              { url, attempts: attempt, totalTimeoutMs }
            );
          }
        } finally {
          overallController.signal.removeEventListener('abort', onOverallAbort);
        }
      }
    } finally {
      clearTimeout(totalDeadlineTimer);
    }
  }

  public async get<T = string>(url: string, options: RequestOptions = {}): Promise<HttpResponse<T>> {
    return this.executeRequest<T>('GET', url, undefined, options);
  }

  public async post<T = string>(url: string, data?: unknown, options: RequestOptions = {}): Promise<HttpResponse<T>> {
    return this.executeRequest<T>('POST', url, data, options);
  }
}

// Default shared singleton instance with standard 8000ms total deadline and per-attempt timeout
export const httpClient = new ResilientHttpClient();
