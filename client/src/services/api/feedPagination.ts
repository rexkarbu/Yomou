import type { NovelSummary } from '../../types/novel';

export type FeedEndReason = 'EXHAUSTED' | 'NO_NEW_ITEMS' | null;

/**
 * Menduplikasi daftar novel dari array per-halaman berdasarkan novel.id unik.
 * Menjaga urutan kemunculan pertama setiap novel.
 */
export function deduplicateNovels(
  pages: readonly (readonly NovelSummary[])[]
): NovelSummary[] {
  const seenIds = new Set<string>();
  const result: NovelSummary[] = [];

  for (const page of pages) {
    for (const novel of page) {
      if (!seenIds.has(novel.id)) {
        seenIds.add(novel.id);
        result.push(novel);
      }
    }
  }

  return result;
}

/**
 * Menghitung parameter halaman berikutnya untuk useInfiniteQuery.
 *
 * Aturan Paginasi:
 * 1. Jika halaman terakhir kosong ([]), menandai akhir katalog -> return undefined.
 * 2. Jika halaman terakhir tidak kosong, tetapi SEMUA ID novel di dalamnya sudah ada
 *    di halaman-halaman sebelumnya -> return undefined (mencegah infinite loop).
 * 3. Jika halaman terakhir memuat minimal satu ID baru -> return allPages.length + 1.
 */
export function calculateNextPageParam(
  lastPage: readonly NovelSummary[] | undefined,
  allPages: readonly (readonly NovelSummary[])[]
): number | undefined {
  if (!lastPage || lastPage.length === 0) {
    return undefined;
  }

  const previousPages = allPages.slice(0, -1);
  if (previousPages.length > 0) {
    const seenIds = new Set(previousPages.flatMap((page) => page.map((n) => n.id)));
    const hasNewIds = lastPage.some((n) => !seenIds.has(n.id));
    if (!hasNewIds) {
      return undefined;
    }
  }

  return allPages.length + 1;
}

/**
 * Mengevaluasi alasan berhentinya feed paginasi:
 * - 'EXHAUSTED': Halaman terakhir mengembalikan array kosong [] (katalog habis).
 * - 'NO_NEW_ITEMS': Halaman terakhir non-kosong tetapi tidak menambah ID baru (pencegahan loop).
 * - null: Feed masih dapat memuat halaman berikutnya atau belum ada data.
 */
export function evaluateFeedEndReason(
  allPages: readonly (readonly NovelSummary[])[] | undefined
): FeedEndReason {
  if (!allPages || allPages.length === 0) {
    return null;
  }

  const lastPage = allPages[allPages.length - 1];
  if (!lastPage) {
    return null;
  }

  if (lastPage.length === 0) {
    return 'EXHAUSTED';
  }

  if (allPages.length > 1) {
    const previousPages = allPages.slice(0, -1);
    const seenIds = new Set(previousPages.flatMap((page) => page.map((n) => n.id)));
    const hasNewIds = lastPage.some((n) => !seenIds.has(n.id));
    if (!hasNewIds) {
      return 'NO_NEW_ITEMS';
    }
  }

  return null;
}

/**
 * Menghasilkan pesan teks akhir feed yang sesuai dengan alasan penghentian.
 */
export function getFeedEndMessage(reason: FeedEndReason): string | null {
  if (reason === 'EXHAUSTED') {
    return 'Semua pembaruan telah dimuat.';
  }
  if (reason === 'NO_NEW_ITEMS') {
    return 'Tidak ada novel baru.';
  }
  return null;
}

/**
 * Menghasilkan pesan teks akhir hasil pencarian yang sesuai dengan alasan penghentian.
 */
export function getSearchEndMessage(reason: FeedEndReason): string | null {
  if (reason === 'EXHAUSTED') {
    return 'Semua hasil pencarian telah dimuat.';
  }
  if (reason === 'NO_NEW_ITEMS') {
    return 'Tidak ada hasil novel baru.';
  }
  return null;
}
