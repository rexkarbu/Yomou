export interface BookmarkUiState {
  isBookmarked: boolean;
  isSavingBookmark: boolean;
  bookmarkNotice: string | null;
}

/**
 * Menerapkan transisi optimistik saat tombol bookmark ditekan pengguna.
 */
export function applyOptimisticBookmarkToggle(
  currentState: boolean
): { targetState: boolean; optimisticState: BookmarkUiState } {
  const targetState = !currentState;
  return {
    targetState,
    optimisticState: {
      isBookmarked: targetState,
      isSavingBookmark: true,
      bookmarkNotice: null,
    },
  };
}

/**
 * Menerapkan status sukses setelah penyimpanan ke database SQLite berhasil diverifikasi.
 */
export function applyBookmarkToggleSuccess(
  targetState: boolean
): BookmarkUiState {
  return {
    isBookmarked: targetState,
    isSavingBookmark: false,
    bookmarkNotice: null,
  };
}

/**
 * Menerapkan rollback dua arah jika penulisan ke database SQLite gagal atau diverifikasi tidak sesuai target.
 */
export function applyBookmarkToggleFailure(
  previousState: boolean,
  targetState: boolean
): BookmarkUiState {
  return {
    isBookmarked: previousState, // Rollback ke status semula
    isSavingBookmark: false,
    bookmarkNotice: targetState
      ? 'Gagal menyimpan bookmark ke penyimpanan lokal.'
      : 'Gagal menghapus bookmark dari penyimpanan lokal.',
  };
}
