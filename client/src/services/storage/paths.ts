/**
 * Path encoding and validation helpers for local storage.
 * Completely collision-free and filesystem-safe across Android and POSIX filesystems.
 * Reference: PRD.md Section 6
 */

/**
 * Validates that a path segment is a non-empty string and does not contain null bytes.
 */
export function validatePathSegment(name: string, value: string): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Invalid path segment for ${name}: must be a non-empty string.`);
  }
  if (value.includes('\0')) {
    throw new Error(`Invalid path segment for ${name}: contains null byte.`);
  }
}

/**
 * Validates and normalizes a file extension (e.g. 'jpg', '.png' -> 'png').
 * Disallows path traversal, slashes, and non-alphanumeric extensions.
 */
export function validateFileExtension(extension: string): string {
  if (typeof extension !== 'string') {
    throw new Error('Invalid file extension: must be a string.');
  }
  const cleanExt = extension.startsWith('.') ? extension.slice(1) : extension;
  if (!/^[a-zA-Z0-9]{1,10}$/.test(cleanExt)) {
    throw new Error(`Invalid file extension "${extension}": must be 1-10 alphanumeric characters.`);
  }
  return cleanExt.toLowerCase();
}

/**
 * Encodes a path segment so that:
 * 1. Hyphens and alphanumeric characters are preserved.
 * 2. All other characters (including '_', '/', ':', '.', etc.) are percent-encoded to '%XX'.
 * This guarantees:
 * - An ID containing '_' (e.g. 'a_b') is encoded as 'a%5Fb' and CANNOT collide with IDs containing
 *   characters previously converted to underscores (e.g. 'a/b' -> 'a%2Fb', 'a:b' -> 'a%3Ab', 'a.b' -> 'a%2Eb').
 * - When joining segments with '_', the '_' delimiter only appears at segment boundaries.
 */
export function encodePathSegment(segment: string): string {
  return encodeURIComponent(segment).replace(/[-_.~!*'()]/g, (char) => {
    if (char === '-') return '-';
    return `%${char.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`;
  });
}

/**
 * Resolves the collision-free relative filename for a novel cover image.
 */
export function formatCoverFilename(novelId: string, extension = 'jpg'): string {
  validatePathSegment('novelId', novelId);
  const cleanExt = validateFileExtension(extension);
  return `${encodePathSegment(novelId)}.${cleanExt}`;
}

/**
 * Resolves the collision-free relative filename for a chapter illustration image.
 */
export function formatChapterImageFilename(
  novelId: string,
  chapterId: string,
  imageId: string,
  extension = 'jpg'
): string {
  validatePathSegment('novelId', novelId);
  validatePathSegment('chapterId', chapterId);
  validatePathSegment('imageId', imageId);
  const cleanExt = validateFileExtension(extension);
  return `${encodePathSegment(novelId)}_${encodePathSegment(chapterId)}_${encodePathSegment(imageId)}.${cleanExt}`;
}

/**
 * Resolves full path URI given a base directory and novelId.
 * Encodes the formatted literal filename as a single URI component so that Expo/Android
 * Uri.path decoding preserves the filename without turning %2F into a directory slash
 * or %5F into a delimiter underscore.
 */
export function resolveCoverPath(coversDir: string, novelId: string, extension = 'jpg'): string {
  const normalizedBase = coversDir.endsWith('/') ? coversDir : `${coversDir}/`;
  const filename = formatCoverFilename(novelId, extension);
  return `${normalizedBase}${encodeURIComponent(filename)}`;
}

/**
 * Resolves full path URI given a base directory, novelId, chapterId, and imageId.
 * Encodes the formatted literal filename as a single URI component so that Expo/Android
 * Uri.path decoding preserves the filename without turning %2F into a directory slash
 * or %5F into a delimiter underscore.
 */
export function resolveChapterImagePath(
  chaptersDir: string,
  novelId: string,
  chapterId: string,
  imageId: string,
  extension = 'jpg'
): string {
  const normalizedBase = chaptersDir.endsWith('/') ? chaptersDir : `${chaptersDir}/`;
  const filename = formatChapterImageFilename(novelId, chapterId, imageId, extension);
  return `${normalizedBase}${encodeURIComponent(filename)}`;
}
