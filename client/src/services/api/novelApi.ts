import { apiRequest, AppError, type RequestOptions } from './apiClient';
import type { NovelSummary, NovelStatus, ChapterSummary, NovelDetail } from '../../types/novel';

/**
 * Memvalidasi apakah sebuah entitas memiliki field inti NovelSummary yang sah.
 * Field opsional (author, latestChapter, synopsis, genres, status) diperiksa tipenya
 * jika tersedia, atau diabaikan secara bersih tanpa rekayasa nilai.
 */
export function validateNovelSummary(raw: unknown): NovelSummary {
  if (typeof raw !== 'object' || raw === null) {
    throw new AppError(
      'RESPONSE_MALFORMED',
      'Item novel dalam respons bukan merupakan objek valid.',
      0,
      null,
      true
    );
  }

  const item = raw as Record<string, unknown>;

  // Validasi field inti yang dibutuhkan antarmuka
  if (typeof item.id !== 'string' || !/^[a-z0-9_-]+$/.test(item.id)) {
    throw new AppError(
      'RESPONSE_MALFORMED',
      'Field inti "id" novel hilang atau tidak valid.',
      0,
      null,
      true
    );
  }

  if (typeof item.title !== 'string' || item.title.trim() === '') {
    throw new AppError(
      'RESPONSE_MALFORMED',
      'Field inti "title" novel hilang atau tidak valid.',
      0,
      null,
      true
    );
  }

  if (typeof item.coverUrl !== 'string') {
    throw new AppError(
      'RESPONSE_MALFORMED',
      'Field inti "coverUrl" novel tidak valid.',
      0,
      null,
      true
    );
  }

  const result: NovelSummary = {
    id: item.id,
    title: item.title.trim(),
    coverUrl: item.coverUrl.trim(),
  };

  // Field opsional: Penulis
  if (typeof item.author === 'string' && item.author.trim() !== '') {
    result.author = item.author.trim();
  }

  // Field opsional: Sinopsis
  if (typeof item.synopsis === 'string' && item.synopsis.trim() !== '') {
    result.synopsis = item.synopsis.trim();
  }

  // Field opsional: Genres
  if (Array.isArray(item.genres)) {
    result.genres = item.genres.filter((g): g is string => typeof g === 'string');
  }

  // Field opsional: Status
  if (item.status === 'Ongoing' || item.status === 'Completed') {
    result.status = item.status as NovelStatus;
  }

  // Field opsional: Total Chapters
  if (typeof item.totalChapters === 'number' && Number.isFinite(item.totalChapters)) {
    result.totalChapters = item.totalChapters;
  }

  // Field opsional: Latest Chapter
  if (typeof item.latestChapter === 'object' && item.latestChapter !== null) {
    const lc = item.latestChapter as Record<string, unknown>;
    if (typeof lc.id === 'string' && typeof lc.title === 'string') {
      result.latestChapter = {
        id: lc.id,
        title: lc.title,
        ...(typeof lc.chapterNumber === 'number' ? { chapterNumber: lc.chapterNumber } : {}),
        ...(typeof lc.releaseDate === 'string' ? { releaseDate: lc.releaseDate } : {}),
      };
    }
  }

  return result;
}

/**
 * Mengambil daftar novel populer dari endpoint GET /api/novels/popular
 */
export async function getPopularNovels(options?: RequestOptions): Promise<NovelSummary[]> {
  const response = await apiRequest<unknown>('/api/novels/popular', options);

  if (!Array.isArray(response.data)) {
    throw new AppError(
      'RESPONSE_MALFORMED',
      'Data novel populer pada envelope sukses bukan berupa array.',
      0,
      null,
      true
    );
  }

  return response.data.map(validateNovelSummary);
}

/**
 * Memvalidasi parameter halaman.
 * Harus berupa bilangan bulat positif aman (>= 1).
 * Menolak input non-integer, <= 0, NaN, Infinity, atau non-number tanpa mutasi diam-diam.
 */
export function validatePageParam(page: unknown): number {
  if (typeof page !== 'number' || !Number.isSafeInteger(page) || page < 1) {
    throw new AppError(
      'BAD_REQUEST',
      'Parameter "page" harus berupa bilangan bulat positif aman.',
      400,
      null,
      true
    );
  }
  return page;
}

/**
 * Mengambil daftar pembaruan terbaru dari endpoint GET /api/novels/latest?page={page}
 */
export async function getLatestNovels(
  page: number = 1,
  options?: RequestOptions
): Promise<NovelSummary[]> {
  const safePage = validatePageParam(page);
  const response = await apiRequest<unknown>(`/api/novels/latest?page=${safePage}`, options);

  if (!Array.isArray(response.data)) {
    throw new AppError(
      'RESPONSE_MALFORMED',
      'Data pembaruan terbaru pada envelope sukses bukan berupa array.',
      0,
      null,
      true
    );
  }

  return response.data.map(validateNovelSummary);
}

/**
 * Mencari novel berdasarkan kata kunci judul dari endpoint GET /api/novels/search?q={query}&page={page}
 */
export async function searchNovels(
  query: string,
  page: number = 1,
  options?: RequestOptions
): Promise<NovelSummary[]> {
  const safePage = validatePageParam(page);
  const trimmed = query.trim();
  if (trimmed === '') {
    return [];
  }
  const encodedQuery = encodeURIComponent(trimmed);
  const response = await apiRequest<unknown>(
    `/api/novels/search?q=${encodedQuery}&page=${safePage}`,
    options
  );

  if (!Array.isArray(response.data)) {
    throw new AppError(
      'RESPONSE_MALFORMED',
      'Data hasil pencarian pada envelope sukses bukan berupa array.',
      0,
      null,
      true
    );
  }

  return response.data.map(validateNovelSummary);
}

/**
 * Memvalidasi format slug novelId kanonik sebelum request.
 * Format kanonik: Tepat satu segmen alfabet-numerik huruf kecil, angka, strip, atau garis bawah [a-z0-9_-]+.
 * Menolak input tanpa trim atau mutasi diam-diam: whitespace tepi/tengah, slash, colon, query/hash, kontrol, traversal.
 */
export function validateNovelId(novelId: unknown): string {
  if (typeof novelId !== 'string') {
    throw new AppError('BAD_REQUEST', 'ID novel harus berupa string.', 400, null, true);
  }
  if (!/^[a-z0-9_-]+$/.test(novelId)) {
    throw new AppError(
      'BAD_REQUEST',
      `ID novel tidak kanonik: "${novelId}". Harus berupa slug satu segmen [a-z0-9_-]+ tanpa whitespace, slash, atau karakter khusus.`,
      400,
      null,
      true
    );
  }
  return novelId;
}

/**
 * Memvalidasi format chapterId kanonik.
 * Format kanonik: Satu atau beberapa segmen [a-z0-9_-]+ yang dipisahkan oleh satu slash '/'.
 * Menolak input tanpa trim: whitespace tepi/tengah, leading/trailing slash, empty segment '//',
 * colon, query/hash, kontrol, traversal, backslash.
 */
export function validateChapterId(chapterId: unknown): string {
  if (typeof chapterId !== 'string' || chapterId === '') {
    throw new AppError('RESPONSE_MALFORMED', 'ID bab harus berupa string non-kosong.', 0, null, true);
  }
  if (chapterId.startsWith('/') || chapterId.endsWith('/')) {
    throw new AppError('RESPONSE_MALFORMED', `ID bab tidak kanonik: diawali atau diakhiri slash: "${chapterId}".`, 0, null, true);
  }
  if (chapterId.includes('//')) {
    throw new AppError('RESPONSE_MALFORMED', `ID bab tidak kanonik: segmen kosong terdeteksi: "${chapterId}".`, 0, null, true);
  }
  const segments = chapterId.split('/');
  for (const seg of segments) {
    if (!/^[a-z0-9_-]+$/.test(seg)) {
      throw new AppError(
        'RESPONSE_MALFORMED',
        `ID bab tidak kanonik: segmen "${seg}" tidak valid pada "${chapterId}".`,
        0,
        null,
        true
      );
    }
  }
  return chapterId;
}

/**
 * Memvalidasi apakah sebuah entitas memiliki field ChapterSummary yang sah.
 * Aturan Ketat:
 * 1. id wajib kanonik (mempertahankan subpath mtl/, menolak .., //, leading/trailing slash, whitespace).
 * 2. chapter.novelId WAJIB ada dan identik dengan expectedNovelId induknya (tanpa fallback diam-diam).
 * 3. chapterNumber wajib berupa angka terhingga (finite number), menerima pecahan.
 */
export function validateChapterSummary(raw: unknown, expectedNovelId: string): ChapterSummary {
  if (typeof raw !== 'object' || raw === null) {
    throw new AppError('RESPONSE_MALFORMED', 'Item bab bukan merupakan objek valid.', 0, null, true);
  }
  const item = raw as Record<string, unknown>;

  if (typeof item.id !== 'string') {
    throw new AppError('RESPONSE_MALFORMED', 'Field "id" bab hilang atau bukan string.', 0, null, true);
  }
  const id = validateChapterId(item.id);

  // Wajib novelId ada dan cocok dengan expectedNovelId tanpa fallback diam-diam
  if (typeof item.novelId !== 'string' || item.novelId !== expectedNovelId) {
    throw new AppError(
      'RESPONSE_MALFORMED',
      `chapter.novelId ("${String(item.novelId)}") tidak cocok dengan novel.id induk ("${expectedNovelId}").`,
      0,
      null,
      true
    );
  }

  if (typeof item.title !== 'string' || item.title.trim() === '') {
    throw new AppError('RESPONSE_MALFORMED', 'Field "title" bab hilang atau kosong.', 0, null, true);
  }

  if (typeof item.chapterNumber !== 'number' || !Number.isFinite(item.chapterNumber)) {
    throw new AppError('RESPONSE_MALFORMED', 'Field "chapterNumber" harus berupa angka terhingga.', 0, null, true);
  }

  const result: ChapterSummary = {
    id,
    novelId: expectedNovelId,
    title: item.title.trim(),
    chapterNumber: item.chapterNumber,
  };

  if (typeof item.releaseDate === 'string' && item.releaseDate.trim() !== '') {
    result.releaseDate = item.releaseDate.trim();
  }

  return result;
}

/**
 * Memvalidasi respons lengkap NovelDetail dari endpoint GET /api/novels/:novelId.
 * Aturan Ketat:
 * 1. Membandingkan raw novel.id dengan requestedNovelId sebelum normalisasi.
 * 2. requestedNovelId wajib berupa ID kanonik yang sah.
 * 3. chapters WAJIB berupa array.
 * 4. Setiap chapter.novelId WAJIB sesuai requestedNovelId.
 * 5. DILARANG ada duplikasi ID bab pada array chapters.
 */
export function validateNovelDetail(raw: unknown, requestedNovelId: string): NovelDetail {
  if (typeof raw !== 'object' || raw === null) {
    throw new AppError('RESPONSE_MALFORMED', 'Data respons detail novel bukan berupa objek.', 0, null, true);
  }
  const rawObj = raw as Record<string, unknown>;

  // Bandingkan raw novel.id dengan requestedNovelId sebelum normalisasi
  if (typeof rawObj.id !== 'string' || rawObj.id !== requestedNovelId) {
    throw new AppError(
      'RESPONSE_MALFORMED',
      `ID novel dalam respons ("${String(rawObj.id)}") tidak sesuai dengan ID yang diminta ("${requestedNovelId}").`,
      0,
      null,
      true
    );
  }

  // Validasi ID kanonik
  validateNovelId(requestedNovelId);

  const summary = validateNovelSummary(raw);

  if (!Array.isArray(rawObj.chapters)) {
    throw new AppError('RESPONSE_MALFORMED', 'Field "chapters" pada respons detail bukan merupakan array.', 0, null, true);
  }

  const seenChapterIds = new Set<string>();
  const chapters: ChapterSummary[] = [];

  for (const rawChapter of rawObj.chapters) {
    const chapter = validateChapterSummary(rawChapter, requestedNovelId);
    if (seenChapterIds.has(chapter.id)) {
      throw new AppError('RESPONSE_MALFORMED', `Ditemukan duplikasi ID bab "${chapter.id}" pada respons detail novel.`, 0, null, true);
    }
    seenChapterIds.add(chapter.id);
    chapters.push(chapter);
  }

  return {
    ...summary,
    chapters,
  };
}

/**
 * Mengambil rincian novel dan seluruh daftar bab dari endpoint GET /api/novels/:novelId
 */
export async function getNovelDetail(
  novelId: string,
  options?: RequestOptions
): Promise<NovelDetail> {
  const safeNovelId = validateNovelId(novelId);
  const response = await apiRequest<unknown>(
    `/api/novels/${encodeURIComponent(safeNovelId)}`,
    options
  );

  return validateNovelDetail(response.data, safeNovelId);
}
