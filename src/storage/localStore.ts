import { ARTWORK, DEFAULT_CONFIG } from '../data/library';
import { MediaItem, ZhdConfig } from '../types';

const CONFIG_STORAGE_KEY = 'zhd2_user_config_v2';
const IDB_NAME = 'ZHD2LocalAssetsDB';
const IDB_STORE = 'mediaFiles';
const IDB_VERSION = 1;

interface StoredLocalAsset {
  id: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  year: number;
  duration: number;
  type: 'audio' | 'video';
  format: string;
  bitrate: string;
  fileName: string;
  fileSize: number;
  folderName?: string;
  addedAt: number;
  blob: Blob;
}

export function loadConfig(): ZhdConfig {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as Partial<ZhdConfig>;
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      eqBands:
        Array.isArray(parsed.eqBands) && parsed.eqBands.length === 10
          ? parsed.eqBands
          : DEFAULT_CONFIG.eqBands,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: ZhdConfig): void {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    if (window.zhd2Desktop?.isDesktop) {
      void window.zhd2Desktop.saveConfig(config);
    }
  } catch {
    // Ignore storage quota errors
  }
}

function openAssetsDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, IDB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadLocalMediaItems(): Promise<MediaItem[]> {
  try {
    const db = await openAssetsDb();
    return await new Promise<MediaItem[]>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const records = (req.result as StoredLocalAsset[]) ?? [];
        const items: MediaItem[] = records.map((rec) => ({
          id: rec.id,
          title: rec.title,
          artist: rec.artist,
          album: rec.album,
          genre: rec.genre,
          year: rec.year,
          duration: rec.duration,
          type: rec.type,
          format: rec.format,
          bitrate: rec.bitrate,
          artwork: rec.type === 'video' ? ARTWORK.metroCinema : ARTWORK.cobaltDrift,
          source: 'local',
          objectUrl: URL.createObjectURL(rec.blob),
          fileName: rec.fileName,
          fileSize: rec.fileSize,
          folderName: rec.folderName,
          addedAt: rec.addedAt,
        }));
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function saveLocalMediaFile(file: File, folderName?: string): Promise<MediaItem> {
  const isVideo =
    file.type.startsWith('video/') ||
    /\.(mp4|webm|mkv|mov|avi|m4v)$/i.test(file.name);
  const extMatch = file.name.match(/\.([a-z0-9]+)$/i);
  const ext = extMatch ? extMatch[1].toUpperCase() : isVideo ? 'MP4' : 'AUDIO';
  const cleanTitle = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();

  // Attempt to split "Artist - Title" naming convention
  let artist = folderName ? folderName : 'Local Library';
  let title = cleanTitle || file.name;
  if (cleanTitle.includes(' - ')) {
    const [maybeArtist, ...rest] = cleanTitle.split(' - ');
    if (maybeArtist.trim() && rest.join(' - ').trim()) {
      artist = maybeArtist.trim();
      title = rest.join(' - ').trim();
    }
  }

  const objectUrl = URL.createObjectURL(file);
  const duration = await probeMediaDuration(objectUrl, isVideo);
  const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
  const resolvedAlbum = folderName || (isVideo ? 'Local Videos' : 'Imported Music');
  const record: StoredLocalAsset = {
    id,
    title,
    artist,
    album: resolvedAlbum,
    genre: isVideo ? 'Local Video' : 'Local Audio',
    year: new Date(file.lastModified || Date.now()).getFullYear(),
    duration: duration || 180,
    type: isVideo ? 'video' : 'audio',
    format: `${ext} Local`,
    bitrate: `${sizeMb} MB`,
    fileName: file.name,
    fileSize: file.size,
    folderName,
    addedAt: Date.now(),
    blob: file,
  };

  try {
    const db = await openAssetsDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Still return playable session item even if IndexedDB quota is exceeded
  }

  return {
    id: record.id,
    title: record.title,
    artist: record.artist,
    album: record.album,
    genre: record.genre,
    year: record.year,
    duration: record.duration,
    type: record.type,
    format: record.format,
    bitrate: record.bitrate,
    artwork: isVideo ? ARTWORK.metroCinema : ARTWORK.cobaltDrift,
    source: 'local',
    objectUrl,
    fileName: record.fileName,
    fileSize: record.fileSize,
    folderName: record.folderName,
    addedAt: record.addedAt,
  };
}

export async function deleteLocalMediaItem(id: string): Promise<void> {
  try {
    const db = await openAssetsDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}

function probeMediaDuration(url: string, isVideo: boolean): Promise<number> {
  return new Promise((resolve) => {
    const el = document.createElement(isVideo ? 'video' : 'audio');
    el.preload = 'metadata';
    const done = (dur: number) => {
      el.removeAttribute('src');
      resolve(Number.isFinite(dur) && dur > 0 ? Math.round(dur) : 0);
    };
    el.onloadedmetadata = () => done(el.duration);
    el.onerror = () => done(0);
    setTimeout(() => done(0), 2500);
    el.src = url;
  });
}
