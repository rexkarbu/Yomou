import { API_CONFIG } from '../../config/api';
import type { ErrorCode, ApiSuccessResponse } from '../../types/api';

export type ClientTransportErrorCode =
  | 'CONFIG_ERROR'
  | 'NETWORK_FAILURE'
  | 'CLIENT_TIMEOUT'
  | 'RESPONSE_MALFORMED'
  | 'REQUEST_CANCELLED';

export type AppErrorCode = ErrorCode | ClientTransportErrorCode;

export const CANONICAL_ERROR_CODES: ReadonlySet<ErrorCode> = new Set<ErrorCode>([
  'CHAPTER_EMPTY_CONTENT',
  'PROVIDER_TIMEOUT',
  'SCRAPER_PARSE_ERROR',
  'PROVIDER_BLOCKED',
  'PROVIDER_NOT_FOUND',
  'NETWORK_UNREACHABLE',
  'BAD_REQUEST',
  'INTERNAL_SERVER_ERROR',
]);

export function isCanonicalErrorCode(code: unknown): code is ErrorCode {
  return typeof code === 'string' && CANONICAL_ERROR_CODES.has(code as ErrorCode);
}

/**
 * Representasi galat terstruktur aplikasi client.
 * Memisahkan kode galat transport client dari kontrak ErrorCode backend.
 */
export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly details: Record<string, unknown> | null;
  readonly isTransportError: boolean;

  constructor(
    code: AppErrorCode,
    message: string,
    status: number = 0,
    details?: Record<string, unknown> | null,
    isTransportError: boolean = false
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details ?? null;
    this.isTransportError = isTransportError;
  }
}

export interface RequestOptions {
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 12000; // 12 detik: memberi ruang bagi total deadline backend 8 detik

/**
 * Melakukan HTTP request dengan penanganan envelope terstruktur, validasi batas jaringan,
 * timeout client 12 detik, dan pembatalan via AbortSignal.
 */
export async function apiRequest<T>(
  path: string,
  options?: RequestOptions
): Promise<ApiSuccessResponse<T>> {
  // 1. Validasi konfigurasi base URL
  if (API_CONFIG.error || !API_CONFIG.baseUrl) {
    throw new AppError(
      'CONFIG_ERROR',
      API_CONFIG.error ?? 'Konfigurasi base URL API belum diatur.',
      0,
      null,
      true
    );
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_CONFIG.baseUrl}${normalizedPath}`;

  // 2. Setup timeout & AbortController
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  let isTimedOut = false;

  const timeoutId = setTimeout(() => {
    isTimedOut = true;
    controller.abort();
  }, timeoutMs);

  const onCallerAbort = () => {
    controller.abort();
  };

  const callerSignal = options?.signal;
  if (callerSignal) {
    if (callerSignal.aborted) {
      clearTimeout(timeoutId);
      throw new AppError('REQUEST_CANCELLED', 'Permintaan dibatalkan.', 0, null, true);
    }
    callerSignal.addEventListener('abort', onCallerAbort);
  }

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    // 3. Baca body teks mentah
    const rawText = await res.text();

    // 4. Parsing JSON aman
    let json: unknown;
    try {
      json = JSON.parse(rawText);
    } catch {
      throw new AppError(
        'RESPONSE_MALFORMED',
        'Respons server tidak berformat JSON valid.',
        res.status,
        null,
        true
      );
    }

    if (typeof json !== 'object' || json === null || Array.isArray(json)) {
      throw new AppError(
        'RESPONSE_MALFORMED',
        'Payload respons server bukan objek valid.',
        res.status,
        null,
        true
      );
    }

    const payload = json as Record<string, unknown>;

    // Validasi field meta bila disediakan (opsional dalam kontrak)
    if ('meta' in payload && payload.meta !== undefined && payload.meta !== null) {
      if (typeof payload.meta !== 'object' || Array.isArray(payload.meta)) {
        throw new AppError(
          'RESPONSE_MALFORMED',
          'Field meta pada respons bukan objek valid.',
          res.status,
          null,
          true
        );
      }
    }

    // 5. Penanganan status HTTP Sukses (200..299)
    if (res.ok) {
      if (payload.success !== true || payload.error !== null || !('data' in payload)) {
        throw new AppError(
          'RESPONSE_MALFORMED',
          'Envelope respons sukses tidak konsisten atau tidak memenuhi kontrak.',
          res.status,
          null,
          true
        );
      }

      return payload as unknown as ApiSuccessResponse<T>;
    }

    // 6. Penanganan status HTTP Galat (4xx, 5xx)
    if (
      payload.success === false &&
      payload.data === null &&
      typeof payload.error === 'object' &&
      payload.error !== null &&
      !Array.isArray(payload.error)
    ) {
      const errObj = payload.error as Record<string, unknown>;

      // Validasi error.code terhadap delapan ErrorCode kanonik (larangan cast sembarang)
      if (!isCanonicalErrorCode(errObj.code)) {
        throw new AppError(
          'RESPONSE_MALFORMED',
          `Kode galat "${String(errObj.code)}" tidak dikenal atau tidak sesuai kontrak API.`,
          res.status,
          null,
          true
        );
      }

      // Validasi error.message string non-kosong
      if (typeof errObj.message !== 'string' || errObj.message.trim() === '') {
        throw new AppError(
          'RESPONSE_MALFORMED',
          'Pesan galat pada respons server bukan string valid.',
          res.status,
          null,
          true
        );
      }

      // Validasi error.details (opsional: jika ada, harus null atau objek non-array)
      let details: Record<string, unknown> | null = null;
      if ('details' in errObj && errObj.details !== undefined && errObj.details !== null) {
        if (typeof errObj.details !== 'object' || Array.isArray(errObj.details)) {
          throw new AppError(
            'RESPONSE_MALFORMED',
            'Field details pada galat server bukan objek valid.',
            res.status,
            null,
            true
          );
        }
        details = errObj.details as Record<string, unknown>;
      }

      throw new AppError(errObj.code, errObj.message, res.status, details, false);
    }

    // Galat HTTP tanpa envelope error terstruktur yang valid atau inkonsisten
    throw new AppError(
      'RESPONSE_MALFORMED',
      `Server mengembalikan status ${res.status} dengan envelope galat yang tidak konsisten.`,
      res.status,
      null,
      true
    );
  } catch (err: unknown) {
    if (err instanceof AppError) {
      throw err;
    }

    // Penanganan timeout client 12 detik
    if (isTimedOut) {
      throw new AppError(
        'CLIENT_TIMEOUT',
        `Waktu permintaan melebihi batas (${Math.round(timeoutMs / 1000)} detik). Server tidak merespons.`,
        0,
        null,
        true
      );
    }

    // Penanganan pembatalan oleh pemanggil (AbortSignal)
    if (callerSignal?.aborted || (err instanceof Error && err.name === 'AbortError')) {
      throw new AppError('REQUEST_CANCELLED', 'Permintaan dibatalkan.', 0, null, true);
    }

    // Penanganan kegagalan jaringan (server down, DNS gagal, SSL error, cleartext traffic ditolak)
    // Catatan: TypeError dari fetch TIDAK membuktikan perangkat offline.
    if (err instanceof TypeError) {
      throw new AppError(
        'NETWORK_FAILURE',
        'Tidak dapat menghubungi server. Periksa sambungan atau status backend.',
        0,
        null,
        true
      );
    }

    // Hindari meneruskan pesan teknis mentah ke pengguna
    throw new AppError(
      'NETWORK_FAILURE',
      'Terjadi gangguan pada sambungan jaringan.',
      0,
      null,
      true
    );
  } finally {
    clearTimeout(timeoutId);
    if (callerSignal) {
      callerSignal.removeEventListener('abort', onCallerAbort);
    }
  }
}
