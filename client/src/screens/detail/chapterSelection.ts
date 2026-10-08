import type { ChapterSummary } from '../../types/novel';

export interface ReadingTargetResult {
  actionLabel: 'Belum Ada Bab' | 'Lanjut Baca' | 'Mulai Baca';
  targetChapterId: string | null;
  hasReadingProgress: boolean;
}

/**
 * Menentukan bab target untuk tombol aksi membaca (Mulai Baca vs Lanjut Baca)
 * berdasarkan ketersediaan bab dan riwayat membaca terakhir.
 *
 * Aturan:
 * 1. Jika daftar bab kosong -> actionLabel: 'Belum Ada Bab', targetChapterId: null.
 * 2. Jika lastReadChapterId ada dan masih tersedia dalam sourceChapters ->
 *    actionLabel: 'Lanjut Baca', targetChapterId: lastReadChapterId.
 * 3. Jika lastReadChapterId tidak ada atau tidak ditemukan (misal bab dihapus oleh upstream) ->
 *    actionLabel: 'Mulai Baca', targetChapterId: sourceChapters[0].id (fallback ke bab pertama).
 */
export function resolveReadingTarget(
  sourceChapters: readonly ChapterSummary[],
  lastReadChapterId: string | null
): ReadingTargetResult {
  if (sourceChapters.length === 0) {
    return {
      actionLabel: 'Belum Ada Bab',
      targetChapterId: null,
      hasReadingProgress: false,
    };
  }

  const hasReadingProgress =
    Boolean(lastReadChapterId) &&
    sourceChapters.some((ch) => ch.id === lastReadChapterId);

  if (hasReadingProgress && lastReadChapterId) {
    return {
      actionLabel: 'Lanjut Baca',
      targetChapterId: lastReadChapterId,
      hasReadingProgress: true,
    };
  }

  return {
    actionLabel: 'Mulai Baca',
    targetChapterId: sourceChapters[0].id,
    hasReadingProgress: false,
  };
}
