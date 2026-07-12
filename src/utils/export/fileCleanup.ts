import * as FileSystem from 'expo-file-system/legacy';

const EXPORT_PREFIX = 'RollBowl_Orders_';
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export const cleanupOldExportFiles = async () => {
  try {
    const dir = FileSystem.cacheDirectory;
    if (!dir) return;

    const files = await FileSystem.readDirectoryAsync(dir);
    const now = Date.now();

    for (const file of files) {
      if (file.startsWith(EXPORT_PREFIX)) {
        const fileUri = dir + file;
        const info = await FileSystem.getInfoAsync(fileUri);
        
        if (info.exists && info.modificationTime) {
          const modTimeMs = info.modificationTime * 1000;
          if (now - modTimeMs > MAX_AGE_MS) {
            await FileSystem.deleteAsync(fileUri, { idempotent: true });
          }
        }
      }
    }
  } catch (err) {
    console.warn('Failed to cleanup old export files:', err);
  }
};
