/**
 * Backend API Contracts & Response Envelopes
 * Reference: PRD.md Section 8.1 & Scraper Resilience Taxonomy
 */

export type ErrorCode =
  | 'CHAPTER_EMPTY_CONTENT'
  | 'PROVIDER_TIMEOUT'
  | 'SCRAPER_PARSE_ERROR'
  | 'PROVIDER_BLOCKED'
  | 'PROVIDER_NOT_FOUND'
  | 'NETWORK_UNREACHABLE'
  | 'BAD_REQUEST'
  | 'INTERNAL_SERVER_ERROR';

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown> | null;
}

export interface ApiMeta {
  source?: string;
  cachedAt?: number;
  page?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  [key: string]: unknown;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  error: null;
  meta?: ApiMeta;
}

export interface ApiErrorResponse {
  success: false;
  data: null;
  error: ApiError;
  meta?: ApiMeta;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
