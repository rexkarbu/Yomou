import * as FileSystem from 'expo-file-system/legacy';
import {
  resolveCoverPath,
  resolveChapterImagePath,
} from './paths';

export * from './paths';

export interface StorageDirectories {
  coversDir: string;
  chaptersDir: string;
}

/**
 * Returns canonical directory paths for covers and chapter illustrations.
 * Throws an explicit error if FileSystem.documentDirectory is not available.
 */
export function getStorageDirectories(): StorageDirectories {
  const baseDir = FileSystem.documentDirectory;
  if (!baseDir) {
    throw new Error('FileSystem.documentDirectory is not available in the current environment.');
  }
  const normalizedBase = baseDir.endsWith('/') ? baseDir : `${baseDir}/`;
  return {
    coversDir: `${normalizedBase}covers/`,
    chaptersDir: `${normalizedBase}chapters/`,
  };
}

/**
 * Ensures required directories (${documentDirectory}/covers/ and ${documentDirectory}/chapters/) exist.
 * Idempotent: safe to run on app startup. Propagates filesystem creation errors to caller.
 */
export async function initFileSystemDirs(): Promise<StorageDirectories> {
  const dirs = getStorageDirectories();

  const coversInfo = await FileSystem.getInfoAsync(dirs.coversDir);
  if (!coversInfo.exists) {
    await FileSystem.makeDirectoryAsync(dirs.coversDir, { intermediates: true });
  }

  const chaptersInfo = await FileSystem.getInfoAsync(dirs.chaptersDir);
  if (!chaptersInfo.exists) {
    await FileSystem.makeDirectoryAsync(dirs.chaptersDir, { intermediates: true });
  }

  return dirs;
}

/**
 * Resolves local file path for a novel cover image.
 * Validates inputs and uses collision-free encoding.
 */
export function getCoverLocalPath(novelId: string, extension = 'jpg'): string {
  const { coversDir } = getStorageDirectories();
  return resolveCoverPath(coversDir, novelId, extension);
}

/**
 * Resolves local file path for a chapter illustration image.
 * Guarantees zero collisions across different combinations of novelId, chapterId, and imageId.
 */
export function getChapterImageLocalPath(
  novelId: string,
  chapterId: string,
  imageId: string,
  extension = 'jpg'
): string {
  const { chaptersDir } = getStorageDirectories();
  return resolveChapterImagePath(chaptersDir, novelId, chapterId, imageId, extension);
}

/**
 * Checks whether a local file exists at the given path.
 * Non-existent file returns false. Access/permission failures propagate to caller.
 */
export async function fileExists(filePath: string): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(filePath);
  return info.exists;
}

/**
 * Deletes a local file if it exists.
 * If file does not exist, silently succeeds (considered absent).
 * Access/deletion failures are propagated to caller.
 */
export async function deleteFile(filePath: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(filePath);
  if (!info.exists) {
    return;
  }
  await FileSystem.deleteAsync(filePath, { idempotent: true });
}
