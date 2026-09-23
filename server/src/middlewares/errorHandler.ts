import type { ErrorHandler, NotFoundHandler } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { ProviderError } from '../errors/provider.error.js';
import { validateNovelSlug, validateChapterSlug } from '../utils/parser.js';
import type { ApiErrorResponse, ErrorCode } from '../types/api.js';

export const PUBLIC_ERROR_MESSAGES: Record<ErrorCode, string> = {
  CHAPTER_EMPTY_CONTENT: 'Konten bab tidak ditemukan atau kosong dari sumber web.',
  PROVIDER_TIMEOUT: 'Batas waktu permintaan ke penyedia novel terlampaui.',
  SCRAPER_PARSE_ERROR: 'Gagal memproses struktur data dari penyedia novel.',
  PROVIDER_BLOCKED: 'Akses ke penyedia novel dibatasi atau terhalang proteksi.',
  PROVIDER_NOT_FOUND: 'Data novel atau bab yang diminta tidak ditemukan.',
  NETWORK_UNREACHABLE: 'Gagal terhubung ke jaringan penyedia novel.',
  BAD_REQUEST: 'Permintaan tidak valid atau parameter tidak sesuai ketentuan.',
  INTERNAL_SERVER_ERROR: 'Terjadi kesalahan internal pada server.',
};

/**
 * Explicit mapping from ErrorCode to public HTTP status codes.
 * Guarantees NETWORK_UNREACHABLE always maps to 503 at the API layer,
 * even when the underlying HTTP client produced status 502.
 */
export const PUBLIC_ERROR_STATUSES: Record<ErrorCode, ContentfulStatusCode> = {
  BAD_REQUEST: 400,
  PROVIDER_NOT_FOUND: 404,
  CHAPTER_EMPTY_CONTENT: 422,
  SCRAPER_PARSE_ERROR: 500,
  INTERNAL_SERVER_ERROR: 500,
  PROVIDER_BLOCKED: 503,
  NETWORK_UNREACHABLE: 503,
  PROVIDER_TIMEOUT: 504,
};

/**
 * Sanitizes details based on the semantic meaning of each allowed field.
 * Validates canonical novelId/chapterId, safe positive integer page, and direction.
 * Rejects paths, URIs with credentials, nested objects, and arbitrary strings.
 */
export function sanitizeErrorDetails(
  rawDetails?: Record<string, unknown>
): Record<string, unknown> | null {
  if (!rawDetails || typeof rawDetails !== 'object' || Array.isArray(rawDetails)) {
    return null;
  }
  const sanitized: Record<string, unknown> = {};

  if (typeof rawDetails.novelId === 'string') {
    try {
      sanitized.novelId = validateNovelSlug(rawDetails.novelId);
    } catch {
      // Reject non-canonical novelId, path traversal, or file paths
    }
  }

  if (typeof rawDetails.chapterId === 'string') {
    try {
      sanitized.chapterId = validateChapterSlug(rawDetails.chapterId);
    } catch {
      // Reject non-canonical chapterId, path traversal, or malformed segments
    }
  }

  if (
    typeof rawDetails.page === 'number' &&
    Number.isSafeInteger(rawDetails.page) &&
    rawDetails.page >= 1
  ) {
    sanitized.page = rawDetails.page;
  }

  if (rawDetails.direction === 'prev' || rawDetails.direction === 'next') {
    sanitized.direction = rawDetails.direction;
  }

  return Object.keys(sanitized).length > 0 ? sanitized : null;
}

/**
 * Global error handler for Hono application.
 * Prevents information leaks by using fixed public messages and statuses based on ErrorCode,
 * sanitizing details semantically, and completely masking unexpected internal errors.
 */
export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof ProviderError) {
    const code: ErrorCode = err.code in PUBLIC_ERROR_STATUSES ? err.code : 'INTERNAL_SERVER_ERROR';
    const status: ContentfulStatusCode = PUBLIC_ERROR_STATUSES[code];
    const message = PUBLIC_ERROR_MESSAGES[code];
    const details = sanitizeErrorDetails(err.details);

    const response: ApiErrorResponse = {
      success: false,
      data: null,
      error: {
        code,
        message,
        details,
      },
      meta: {
        source: 'yomou-server',
      },
    };
    return c.json(response, status);
  }

  // Generic or unexpected exception
  const response: ApiErrorResponse = {
    success: false,
    data: null,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: PUBLIC_ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      details: null,
    },
    meta: {
      source: 'yomou-server',
    },
  };
  return c.json(response, 500);
};

/**
 * Global 404 handler for unmatched routes.
 */
export const notFoundHandler: NotFoundHandler = (c) => {
  const response: ApiErrorResponse = {
    success: false,
    data: null,
    error: {
      code: 'PROVIDER_NOT_FOUND',
      message: 'Rute tidak ditemukan.',
      details: null,
    },
    meta: {
      source: 'yomou-server',
    },
  };
  return c.json(response, 404);
};
