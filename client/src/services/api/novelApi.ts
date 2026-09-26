import { apiRequest, AppError, type RequestOptions } from './apiClient';
import type { NovelSummary, NovelStatus } from '../../types/novel';

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
  if (typeof item.id !== 'string' || item.id.trim() === '') {
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
    id: item.id.trim(),
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
 * Mengambil daftar pembaruan terbaru dari endpoint GET /api/novels/latest?page={page}
 */
export async function getLatestNovels(
  page: number = 1,
  options?: RequestOptions
): Promise<NovelSummary[]> {
  const safePage = Math.max(1, Math.floor(page));
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
