export interface ImportedFileEntry {
  file: File;
  folderName?: string;
}

const SUPPORTED_MEDIA_EXT = /\.(mp3|flac|wav|ogg|m4a|aac|opus|mp4|webm|mkv|mov|avi|m4v)$/i;

export function isSupportedMediaFile(file: File): boolean {
  if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
    return true;
  }
  return SUPPORTED_MEDIA_EXT.test(file.name);
}

export function extractFilesFromFileList(fileList: FileList | null): ImportedFileEntry[] {
  if (!fileList || fileList.length === 0) return [];
  const entries: ImportedFileEntry[] = [];

  for (const file of Array.from(fileList)) {
    if (!isSupportedMediaFile(file)) continue;
    const relPath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || '';
    let folderName: string | undefined;
    if (relPath.includes('/')) {
      const segments = relPath.split('/').filter(Boolean);
      // Use the immediate parent folder containing the file
      if (segments.length >= 2) {
        folderName = segments[segments.length - 2];
      }
    }
    entries.push({ file, folderName });
  }

  return entries.sort((a, b) => a.file.name.localeCompare(b.file.name, undefined, { numeric: true }));
}

interface FsEntry {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
}

interface FsFileEntry extends FsEntry {
  file: (cb: (file: File) => void, err?: (e: unknown) => void) => void;
}

interface FsDirectoryReader {
  readEntries: (cb: (entries: FsEntry[]) => void, err?: (e: unknown) => void) => void;
}

interface FsDirectoryEntry extends FsEntry {
  createReader: () => FsDirectoryReader;
}

async function readAllDirectoryEntries(dirEntry: FsDirectoryEntry): Promise<FsEntry[]> {
  const reader = dirEntry.createReader();
  const collected: FsEntry[] = [];

  while (true) {
    const batch = await new Promise<FsEntry[]>((resolve) => {
      reader.readEntries(
        (entries) => resolve(entries),
        () => resolve([])
      );
    });
    if (batch.length === 0) break;
    collected.push(...batch);
  }

  return collected;
}

async function walkEntry(
  entry: FsEntry,
  parentFolder: string | undefined,
  depth: number,
  out: ImportedFileEntry[]
): Promise<void> {
  if (depth > 5) return;

  if (entry.isFile) {
    const file = await new Promise<File | null>((resolve) => {
      (entry as FsFileEntry).file(
        (f) => resolve(f),
        () => resolve(null)
      );
    });
    if (file && isSupportedMediaFile(file)) {
      out.push({ file, folderName: parentFolder });
    }
    return;
  }

  if (entry.isDirectory) {
    const children = await readAllDirectoryEntries(entry as FsDirectoryEntry);
    for (const child of children) {
      await walkEntry(child, entry.name, depth + 1, out);
    }
  }
}

export async function extractFilesFromDataTransfer(
  dataTransfer: DataTransfer
): Promise<ImportedFileEntry[]> {
  const items = dataTransfer.items;
  if (items && items.length > 0) {
    const results: ImportedFileEntry[] = [];
    let usedEntryApi = false;

    const topEntries: FsEntry[] = [];
    for (const item of Array.from(items)) {
      const webkitGetAsEntry = (
        item as DataTransferItem & { webkitGetAsEntry?: () => FsEntry | null }
      ).webkitGetAsEntry;
      if (typeof webkitGetAsEntry === 'function') {
        const entry = webkitGetAsEntry.call(item);
        if (entry) {
          usedEntryApi = true;
          topEntries.push(entry);
        }
      }
    }

    if (usedEntryApi) {
      for (const entry of topEntries) {
        await walkEntry(entry, undefined, 0, results);
      }
      return results.sort((a, b) =>
        a.file.name.localeCompare(b.file.name, undefined, { numeric: true })
      );
    }
  }

  return extractFilesFromFileList(dataTransfer.files);
}
