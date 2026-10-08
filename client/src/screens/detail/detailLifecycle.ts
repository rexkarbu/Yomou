/**
 * DetailLifecycleTracker
 *
 * Mengelola penanda sesi (sessionId) dan operasi (operationId) yang tidak dapat digunakan ulang,
 * serta guard konkurensi sinkron untuk layar Detail Novel.
 *
 * Mencegah:
 * 1. Balapan antar-sesi pada pergantian rute A -> B -> A.
 * 2. Operasi async sesi lama membuka lock sinkron operasi sesi baru di blok finally.
 * 3. Hasil reload/sync lokal lama menimpa mutasi bookmark yang lebih baru.
 * 4. Pemicuan bookmark atau refresh ganda sebelum siklus render selesai.
 */

export interface DetailSessionToken {
  readonly sessionId: number;
  readonly opId: number;
}

export interface LocalReadStartToken extends DetailSessionToken {
  readonly mutationVersionAtStart: number;
}

export interface SyncStartToken {
  readonly sessionId: number;
  readonly mutationVersionAtStart: number;
}

export interface BookmarkStartToken extends DetailSessionToken {
  readonly mutationVersion: number;
}

export class DetailLifecycleTracker {
  private activeSessionId = 0;
  private localReadOpId = 0;
  private bookmarkOpId = 0;
  private refreshOpId = 0;
  private bookmarkMutationVersion = 0;

  // Guard status sinkron
  public isSavingBookmark = false;
  public isRefreshing = false;

  /**
   * Memulai sesi baru untuk layar detail novel.
   * Setiap pergantian novelId atau inisialisasi menghasilkan sessionId baru.
   */
  startSession(): number {
    this.activeSessionId += 1;
    this.bookmarkMutationVersion = 0;
    this.isSavingBookmark = false;
    this.isRefreshing = false;
    return this.activeSessionId;
  }

  /**
   * Membatalkan sesi aktif saat unmount atau saat effect dibersihkan sebelum rute berikutnya.
   */
  invalidateSession(): void {
    this.activeSessionId += 1;
    this.isSavingBookmark = false;
    this.isRefreshing = false;
  }

  getSessionId(): number {
    return this.activeSessionId;
  }

  getBookmarkMutationVersion(): number {
    return this.bookmarkMutationVersion;
  }

  isSessionActive(sessionId: number): boolean {
    return sessionId > 0 && this.activeSessionId === sessionId;
  }

  // --- 1. Pembacaan Lokal (reloadLocalData) ---

  startLocalRead(): LocalReadStartToken {
    const sessionId = this.activeSessionId;
    const opId = ++this.localReadOpId;
    const mutationVersionAtStart = this.bookmarkMutationVersion;
    return { sessionId, opId, mutationVersionAtStart };
  }

  canApplyLocalReadResult(token: DetailSessionToken): boolean {
    return this.isSessionActive(token.sessionId) && this.localReadOpId === token.opId;
  }

  canApplyLocalReadBookmark(mutationVersionAtStart: number): boolean {
    return !this.isSavingBookmark && this.bookmarkMutationVersion === mutationVersionAtStart;
  }

  // --- 2. Sinkronisasi Katalog (syncNovelMetadata) ---

  startSync(): SyncStartToken {
    return {
      sessionId: this.activeSessionId,
      mutationVersionAtStart: this.bookmarkMutationVersion,
    };
  }

  canApplySyncResult(sessionId: number, isCancelled: boolean): boolean {
    return !isCancelled && this.isSessionActive(sessionId);
  }

  canApplySyncBookmark(mutationVersionAtStart: number): boolean {
    return !this.isSavingBookmark && this.bookmarkMutationVersion === mutationVersionAtStart;
  }

  // --- 3. Mutasi Bookmark (onBookmarkPress) ---

  canStartBookmark(storageStatus: string, hasActiveNovel: boolean): boolean {
    return hasActiveNovel && storageStatus === 'READY' && !this.isSavingBookmark;
  }

  startBookmark(): BookmarkStartToken | null {
    if (this.isSavingBookmark) {
      return null;
    }
    this.isSavingBookmark = true;
    const sessionId = this.activeSessionId;
    const opId = ++this.bookmarkOpId;
    const mutationVersion = ++this.bookmarkMutationVersion;
    return { sessionId, opId, mutationVersion };
  }

  canApplyBookmarkResult(token: DetailSessionToken): boolean {
    return this.isSessionActive(token.sessionId) && this.bookmarkOpId === token.opId;
  }

  releaseBookmarkLock(token: DetailSessionToken): boolean {
    if (this.isSessionActive(token.sessionId) && this.bookmarkOpId === token.opId) {
      this.isSavingBookmark = false;
      return true;
    }
    return false;
  }

  // --- 4. Refresh & Retry (onRefresh) ---

  canStartRefresh(isFetching: boolean): boolean {
    return !this.isRefreshing && !isFetching;
  }

  startRefresh(isFetching: boolean): DetailSessionToken | null {
    if (this.isRefreshing || isFetching) {
      return null;
    }
    this.isRefreshing = true;
    const sessionId = this.activeSessionId;
    const opId = ++this.refreshOpId;
    return { sessionId, opId };
  }

  canApplyRefreshResult(token: DetailSessionToken): boolean {
    return this.isSessionActive(token.sessionId) && this.refreshOpId === token.opId;
  }

  releaseRefreshLock(token: DetailSessionToken): boolean {
    if (this.isSessionActive(token.sessionId) && this.refreshOpId === token.opId) {
      this.isRefreshing = false;
      return true;
    }
    return false;
  }
}
