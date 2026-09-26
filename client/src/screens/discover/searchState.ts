import type { NovelSummary } from '../../types/novel';

export type SearchUiState =
  | { type: 'IDLE' }
  | { type: 'DEBOUNCING'; query: string }
  | { type: 'LOADING' }
  | { type: 'ERROR'; message: string; isCancelled: boolean }
  | { type: 'EMPTY'; query: string }
  | { type: 'SUCCESS'; count: number; refetchError: string | null };

export interface ResolveSearchUiStateParams {
  rawInput: string;
  debouncedQuery: string;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  isRefetchError?: boolean;
  error: unknown;
  items: readonly NovelSummary[];
}

/**
 * Menentukan status tampilan pencarian secara deterministik dari state query dan input.
 *
 * Aturan Transisi:
 * 1. Jika rawInput (setelah trim) kosong -> IDLE (menampilkan Beranda Discover).
 * 2. Jika rawInput (setelah trim) != debouncedQuery -> DEBOUNCING (menampilkan status menunggu debounce,
 *    tanpa menampilkan data/error dari query lama).
 * 3. Jika ada item hasil pencarian (items.length > 0) -> SUCCESS.
 *    Banner refresh HANYA muncul jika isRefetchError bernilai true (bukan error pagination).
 *    Jika refetch dibatalkan (REQUEST_CANCELLED), banner tidak ditampilkan.
 * 4. Jika sedang loading awal (isLoading) tanpa data -> LOADING.
 * 5. Jika terjadi error pemuatan awal (isError) tanpa data -> ERROR (dengan flag isCancelled).
 * 6. Jika query sukses dan items.length === 0 -> EMPTY.
 *    (PENTING: Status kosong HANYA muncul setelah respons sukses halaman pertama [].
 *     Request yang dibatalkan atau belum berjalan TIDAK BOLEH dianggap hasil kosong).
 */
export function resolveSearchUiState(params: ResolveSearchUiStateParams): SearchUiState {
  const trimmedInput = params.rawInput.trim();
  if (trimmedInput === '') {
    return { type: 'IDLE' };
  }

  // Input seketika berbeda dengan query debounce -> mode menunggu debounce aktif
  if (trimmedInput !== params.debouncedQuery) {
    return { type: 'DEBOUNCING', query: trimmedInput };
  }

  // Jika sudah ada item hasil, tampilkan SUCCESS
  if (params.items.length > 0) {
    const isCancelled =
      params.error instanceof Error &&
      'code' in params.error &&
      (params.error as { code?: string }).code === 'REQUEST_CANCELLED';
    const refetchError =
      Boolean(params.isRefetchError) && !isCancelled
        ? params.error instanceof Error
          ? params.error.message
          : 'Gagal menyegarkan hasil pencarian.'
        : null;
    return { type: 'SUCCESS', count: params.items.length, refetchError };
  }

  // Memuat halaman pertama
  if (params.isLoading) {
    return { type: 'LOADING' };
  }

  // Galat halaman pertama
  if (params.isError) {
    const isCancelled =
      params.error instanceof Error &&
      'code' in params.error &&
      (params.error as { code?: string }).code === 'REQUEST_CANCELLED';
    return {
      type: 'ERROR',
      message:
        params.error instanceof Error
          ? params.error.message
          : 'Gagal melakukan pencarian novel.',
      isCancelled,
    };
  }

  // Hanya jika respons sukses dan benar-benar tidak ada item
  if (params.isSuccess && params.items.length === 0) {
    return { type: 'EMPTY', query: params.debouncedQuery };
  }

  return { type: 'IDLE' };
}

/**
 * Pengelola debounce input pencarian teruji di level produksi.
 * - Input bertahap yang cepat hanya menjadwalkan timer dan mengeksekusi input terakhir.
 * - Input kosong atau whitespace langsung mereset seketika tanpa jeda timer.
 * - Pembersihan (clear/destroy) membatalkan timer yang tertunda.
 */
export class SearchDebounceManager {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private delayMs: number;
  private onCommit: (debouncedQuery: string) => void;

  constructor(delayMs: number, onCommit: (debouncedQuery: string) => void) {
    this.delayMs = delayMs;
    this.onCommit = onCommit;
  }

  public setInput(input: string): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const trimmed = input.trim();
    if (trimmed === '') {
      this.onCommit('');
      return;
    }

    this.timer = setTimeout(() => {
      this.onCommit(trimmed);
      this.timer = null;
    }, this.delayMs);
  }

  public clear(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.onCommit('');
  }

  public destroy(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
