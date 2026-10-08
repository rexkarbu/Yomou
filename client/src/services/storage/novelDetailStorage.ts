import type * as SQLite from 'expo-sqlite';
import type { NovelSummary, NovelDetail, ChapterSummary } from '../../types/novel';

export class StorageError extends Error {
  readonly code: 'STORAGE_ERROR' = 'STORAGE_ERROR';

  constructor(message: string) {
    super(message);
    this.name = 'StorageError';
  }
}

export interface LocalNovelDetailSnapshot {
  novel: NovelSummary;
  isBookmarked: boolean;
  isChapterListSynced: boolean;
  chapters: ChapterSummary[] | null; // null jika belum tersinkronisasi; [] jika tersinkronisasi kosong
  lastReadChapterId: string | null;
  updatedAt: number;
}

/**
 * Peta antrean penguncian in-flight per novelId untuk memastikan operasi tulis
 * (sinkronisasi metadata dan perubahan bookmark) pada novel yang sama dieksekusi secara serial.
 */
const novelLockMap = new Map<string, Promise<unknown>>();

export async function runExclusiveNovelOperation<T>(
  novelId: string,
  operation: () => Promise<T>
): Promise<T> {
  const currentLock = novelLockMap.get(novelId) ?? Promise.resolve();
  let release: () => void = () => {};
  const nextLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  novelLockMap.set(novelId, nextLock);

  try {
    await currentLock;
    return await operation();
  } finally {
    release();
    if (novelLockMap.get(novelId) === nextLock) {
      novelLockMap.delete(novelId);
    }
  }
}

/**
 * Membaca snapshot data lokal detail novel dari database SQLite.
 *
 * Aturan Integritas:
 * 1. Jika baris novel tidak ditemukan di tabel novels -> return null.
 * 2. Jika synced_chapter_ids IS NULL -> isChapterListSynced = false, chapters = null (Tingkat 1).
 * 3. Jika synced_chapter_ids adalah string array kosong '[]' -> isChapterListSynced = true, chapters = [] (Kosong sah).
 * 4. Jika synced_chapter_ids bukan format JSON string array yang sah -> lempar STORAGE_ERROR (snapshot korup).
 * 5. Jika ada ID pada snapshot yang barisnya tidak ditemukan di tabel chapters -> lempar STORAGE_ERROR (sinkronisasi parsial).
 * 6. Bab direkonstruksi secara deterministik tepat mengikuti urutan indeks synced_chapter_ids.
 */
export async function loadLocalNovelDetailSnapshot(
  db: SQLite.SQLiteDatabase,
  novelId: string
): Promise<LocalNovelDetailSnapshot | null> {
  const novelRow = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT id, title, author, cover_url, local_cover_path, synopsis, genres, status, total_chapters, is_bookmarked, synced_chapter_ids, updated_at
     FROM novels
     WHERE id = ?`,
    [novelId]
  );

  if (!novelRow) {
    return null;
  }

  let genres: string[] | undefined;
  if (typeof novelRow.genres === 'string' && novelRow.genres.trim() !== '') {
    try {
      const parsedGenres = JSON.parse(novelRow.genres);
      if (Array.isArray(parsedGenres)) {
        genres = parsedGenres.filter((g): g is string => typeof g === 'string');
      }
    } catch {
      // Abaikan parsing genres yang tidak valid
    }
  }

  const novelSummary: NovelSummary = {
    id: String(novelRow.id),
    title: String(novelRow.title),
    coverUrl: String(novelRow.cover_url),
    ...(typeof novelRow.author === 'string' ? { author: novelRow.author } : {}),
    ...(typeof novelRow.synopsis === 'string' ? { synopsis: novelRow.synopsis } : {}),
    ...(genres ? { genres } : {}),
    ...(novelRow.status === 'Ongoing' || novelRow.status === 'Completed'
      ? { status: novelRow.status }
      : {}),
    ...(typeof novelRow.total_chapters === 'number'
      ? { totalChapters: novelRow.total_chapters }
      : {}),
  };

  const isBookmarked = Number(novelRow.is_bookmarked) === 1;
  const rawSyncedIds = novelRow.synced_chapter_ids;

  let isChapterListSynced = false;
  let chapters: ChapterSummary[] | null = null;

  if (rawSyncedIds === null || rawSyncedIds === undefined) {
    // Belum pernah disinkronisasi dari respons API
    isChapterListSynced = false;
    chapters = null;
  } else if (typeof rawSyncedIds === 'string') {
    let parsedIds: unknown;
    try {
      parsedIds = JSON.parse(rawSyncedIds);
    } catch {
      throw new StorageError(
        `Snapshot daftar bab lokal untuk novel "${novelId}" korup atau bukan JSON yang valid.`
      );
    }

    if (!Array.isArray(parsedIds) || !parsedIds.every((id) => typeof id === 'string')) {
      throw new StorageError(
        `Snapshot daftar bab lokal untuk novel "${novelId}" korup (harus berupa array string).`
      );
    }

    const chapterIds = parsedIds as string[];
    isChapterListSynced = true;

    if (chapterIds.length === 0) {
      chapters = [];
    } else {
      // Ambil seluruh baris bab dari tabel chapters untuk novelId ini
      const chapterRows = await db.getAllAsync<Record<string, unknown>>(
        `SELECT id, novel_id, title, chapter_number, release_date
         FROM chapters
         WHERE novel_id = ?`,
        [novelId]
      );

      const chapterMap = new Map<string, ChapterSummary>();
      for (const row of chapterRows) {
        chapterMap.set(String(row.id), {
          id: String(row.id),
          novelId: String(row.novel_id),
          title: String(row.title),
          chapterNumber: Number(row.chapter_number),
          ...(typeof row.release_date === 'string' ? { releaseDate: row.release_date } : {}),
        });
      }

      // Rekonstruksi urutan persis sesuai indeks chapterIds
      const orderedChapters: ChapterSummary[] = [];
      for (const id of chapterIds) {
        const found = chapterMap.get(id);
        if (!found) {
          throw new StorageError(
            `Inkonsistensi snapshot: Bab "${id}" tercatat dalam snapshot tetapi baris datanya tidak ditemukan di database.`
          );
        }
        orderedChapters.push(found);
      }

      chapters = orderedChapters;
    }
  }

  // Ambil bab terakhir dibaca dari chapter_reading_progress
  const progressRow = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT chapter_id
     FROM chapter_reading_progress
     WHERE novel_id = ?
     ORDER BY updated_at DESC
     LIMIT 1`,
    [novelId]
  );

  const lastReadChapterId =
    progressRow && typeof progressRow.chapter_id === 'string' ? progressRow.chapter_id : null;

  return {
    novel: novelSummary,
    isBookmarked,
    isChapterListSynced,
    chapters,
    lastReadChapterId,
    updatedAt: typeof novelRow.updated_at === 'number' ? novelRow.updated_at : Date.now(),
  };
}

/**
 * Menyinkronkan metadata novel dan daftar bab terbaru ke SQLite secara atomik.
 *
 * Aturan Proteksi Data:
 * 1. Menggunakan withExclusiveTransactionAsync dan seluruh query dieksekusi via txn.
 * 2. Mempertahankan nilai is_bookmarked lokal yang sudah ada (tidak mereset ke 0).
 * 3. Memasukkan bab baru atau memperbarui judul/nomor bab via ON CONFLICT DO UPDATE.
 * 4. Kolom content_blocks, download_status, dan downloaded_at pada tabel chapters
 *    TIDAK PERNAH ditimpa agar konten yang sudah terunduh tetap aman.
 * 5. Bab lama yang mungkin tidak ada di respons rilis baru tidak dihapus agar progres membaca
 *    dan unduhan tetap terlindungi.
 * 6. synced_chapter_ids diperbarui secara atomik menyimpan urutan kanonik terkini.
 */
export async function syncNovelMetadata(
  db: SQLite.SQLiteDatabase,
  novelDetail: NovelDetail
): Promise<void> {
  await runExclusiveNovelOperation(novelDetail.id, async () => {
    await db.withExclusiveTransactionAsync(async (txn) => {
      const now = Date.now();
      const syncedIdsJson = JSON.stringify(novelDetail.chapters.map((ch) => ch.id));
      const genresJson = JSON.stringify(novelDetail.genres ?? []);

      // 1. Upsert novel metadata dengan mempertahankan is_bookmarked yang sudah ada
      await txn.runAsync(
        `INSERT INTO novels (
           id, title, author, cover_url, synopsis, genres, status, total_chapters, is_bookmarked, synced_chapter_ids, created_at, updated_at
         ) VALUES (
           ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?
         )
         ON CONFLICT(id) DO UPDATE SET
           title = excluded.title,
           author = excluded.author,
           cover_url = excluded.cover_url,
           synopsis = excluded.synopsis,
           genres = excluded.genres,
           status = excluded.status,
           total_chapters = excluded.total_chapters,
           synced_chapter_ids = excluded.synced_chapter_ids,
           updated_at = excluded.updated_at`,
        [
          novelDetail.id,
          novelDetail.title,
          novelDetail.author ?? null,
          novelDetail.coverUrl,
          novelDetail.synopsis ?? null,
          genresJson,
          novelDetail.status ?? null,
          novelDetail.totalChapters ?? novelDetail.chapters.length,
          syncedIdsJson,
          now,
          now,
        ]
      );

      // 2. Upsert masing-masing bab tanpa merusak content_blocks atau download_status
      for (const ch of novelDetail.chapters) {
        await txn.runAsync(
          `INSERT INTO chapters (
             novel_id, id, title, chapter_number, release_date
           ) VALUES (
             ?, ?, ?, ?, ?
           )
           ON CONFLICT(novel_id, id) DO UPDATE SET
             title = excluded.title,
             chapter_number = excluded.chapter_number,
             release_date = excluded.release_date`,
          [ch.novelId, ch.id, ch.title, ch.chapterNumber, ch.releaseDate ?? null]
        );
      }
    });
  });
}

/**
 * Mengubah status bookmark novel secara atomik.
 *
 * Aturan Keandalan:
 * 1. Menangani kasus saat user menekan Bookmark sebelum sinkronisasi API pertama selesai
 *    (baris novel belum ada di database) melalui upsert metadata minimal.
 * 2. Tidak menyalin ulang seluruh bab jika bab sudah tersimpan.
 * 3. Memverifikasi secara eksplisit bahwa nilai target benar-benar tersimpan di database.
 * 4. Melempar error jika verifikasi gagal sehingga pemanggil dapat melakukan rollback UI.
 */
export async function toggleNovelBookmark(
  db: SQLite.SQLiteDatabase,
  novel: NovelSummary,
  targetState: boolean
): Promise<boolean> {
  return await runExclusiveNovelOperation(novel.id, async () => {
    await db.withExclusiveTransactionAsync(async (txn) => {
      const now = Date.now();
      const targetBookmarkValue = targetState ? 1 : 0;
      const genresJson = JSON.stringify(novel.genres ?? []);

      // Upsert baris novel secara atomik
      await txn.runAsync(
        `INSERT INTO novels (
           id, title, author, cover_url, synopsis, genres, status, total_chapters, is_bookmarked, created_at, updated_at
         ) VALUES (
           ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
         )
         ON CONFLICT(id) DO UPDATE SET
           is_bookmarked = excluded.is_bookmarked,
           updated_at = excluded.updated_at`,
        [
          novel.id,
          novel.title,
          novel.author ?? null,
          novel.coverUrl,
          novel.synopsis ?? null,
          genresJson,
          novel.status ?? null,
          novel.totalChapters ?? 0,
          targetBookmarkValue,
          now,
          now,
        ]
      );

      // Verifikasi eksplisit bahwa status target benar-benar tersimpan di SQLite
      const verifiedRow = await txn.getFirstAsync<Record<string, unknown>>(
        `SELECT is_bookmarked FROM novels WHERE id = ?`,
        [novel.id]
      );

      if (!verifiedRow || Number(verifiedRow.is_bookmarked) !== targetBookmarkValue) {
        throw new StorageError(
          `Verifikasi status bookmark gagal. Nilai tersimpan tidak sesuai dengan target (${targetBookmarkValue}).`
        );
      }
    });

    return targetState;
  });
}
