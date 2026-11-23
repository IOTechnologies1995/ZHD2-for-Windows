import { DragEvent, useMemo, useState } from 'react';
import {
  FilePlus2,
  Film,
  FolderOpen,
  Heart,
  Music,
  Play,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { MediaItem } from '../types';
import { extractFilesFromDataTransfer, ImportedFileEntry } from '../utils/folderImport';
import { formatDuration } from '../utils/format';
import { MediaArt } from './MediaArt';

type PivotTab = 'songs' | 'albums' | 'artists' | 'videos' | 'local';

interface LibraryViewProps {
  mediaItems: MediaItem[];
  currentItem: MediaItem;
  isPlaying: boolean;
  favoriteIds: string[];
  onPlayItem: (item: MediaItem, openNowPlaying?: boolean) => void;
  onToggleFavorite: (id: string) => void;
  onImportFiles: (files: FileList | null) => void;
  onImportEntries: (entries: ImportedFileEntry[]) => void;
  onTriggerFolderImport: () => void;
  onDeleteLocalItem: (id: string) => void;
}

export function LibraryView({
  mediaItems,
  currentItem,
  isPlaying,
  favoriteIds,
  onPlayItem,
  onToggleFavorite,
  onImportFiles,
  onImportEntries,
  onTriggerFolderImport,
  onDeleteLocalItem,
}: LibraryViewProps) {
  const [activeTab, setActiveTab] = useState<PivotTab>('songs');
  const [query, setQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredItems = useMemo(() => {
    return mediaItems.filter((item) => {
      if (activeTab === 'songs' && item.type !== 'audio') return false;
      if (activeTab === 'videos' && item.type !== 'video') return false;
      if (activeTab === 'local' && item.source !== 'local') return false;
      if (!normalizedQuery) return true;
      return (
        item.title.toLowerCase().includes(normalizedQuery) ||
        item.artist.toLowerCase().includes(normalizedQuery) ||
        item.album.toLowerCase().includes(normalizedQuery) ||
        item.genre.toLowerCase().includes(normalizedQuery) ||
        (item.folderName ?? '').toLowerCase().includes(normalizedQuery)
      );
    });
  }, [mediaItems, activeTab, normalizedQuery]);

  const albums = useMemo(() => {
    const map = new Map<
      string,
      { album: string; artist: string; year: number; artwork: string; items: MediaItem[] }
    >();
    for (const item of mediaItems) {
      if (item.type !== 'audio') continue;
      if (
        normalizedQuery &&
        !item.album.toLowerCase().includes(normalizedQuery) &&
        !item.artist.toLowerCase().includes(normalizedQuery)
      ) {
        continue;
      }
      const existing = map.get(item.album);
      if (existing) {
        existing.items.push(item);
      } else {
        map.set(item.album, {
          album: item.album,
          artist: item.artist,
          year: item.year,
          artwork: item.artwork,
          items: [item],
        });
      }
    }
    return Array.from(map.values());
  }, [mediaItems, normalizedQuery]);

  const artists = useMemo(() => {
    const map = new Map<string, { artist: string; artwork: string; items: MediaItem[] }>();
    for (const item of mediaItems) {
      if (
        normalizedQuery &&
        !item.artist.toLowerCase().includes(normalizedQuery) &&
        !item.title.toLowerCase().includes(normalizedQuery)
      ) {
        continue;
      }
      const existing = map.get(item.artist);
      if (existing) {
        existing.items.push(item);
      } else {
        map.set(item.artist, {
          artist: item.artist,
          artwork: item.artwork,
          items: [item],
        });
      }
    }
    return Array.from(map.values());
  }, [mediaItems, normalizedQuery]);

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const entries = await extractFilesFromDataTransfer(e.dataTransfer);
    if (entries.length > 0) {
      onImportEntries(entries);
    }
  };

  const tabs: Array<{ id: PivotTab; label: string }> = [
    { id: 'songs', label: 'songs' },
    { id: 'albums', label: 'albums' },
    { id: 'artists', label: 'artists' },
    { id: 'videos', label: 'videos' },
    { id: 'local', label: 'local files' },
  ];

  return (
    <div
      className="h-full overflow-y-auto px-6 lg:px-10 py-8"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setIsDragging(false);
      }}
      onDrop={(e) => {
        void handleDrop(e);
      }}
    >
      <div className="max-w-[1380px] mx-auto flex flex-col gap-6">
        {/* Zune HD Panorama Pivot Header */}
        <div className="flex flex-wrap items-end justify-between gap-6 border-b border-[var(--zhd-border)] pb-5">
          <div>
            <p className="text-xs font-medium text-[var(--zhd-muted)] mb-2">
              Collection · Audio & Video
            </p>
            <div className="flex flex-wrap items-baseline gap-6">
              {tabs.map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`font-display text-3xl sm:text-4xl tracking-tight whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                      active
                        ? 'font-normal text-[var(--zhd-text)]'
                        : 'font-light text-[var(--zhd-muted)] hover:text-[var(--zhd-text)]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search & Import Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-[var(--zhd-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter library..."
                style={{ borderRadius: 'var(--zhd-radius)' }}
                className="w-52 pl-9 pr-3 py-2 text-sm bg-[var(--zhd-surface)] border border-[var(--zhd-border)] text-[var(--zhd-text)] placeholder:text-[var(--zhd-muted)]"
              />
            </div>

            <button
              type="button"
              onClick={onTriggerFolderImport}
              style={{ borderRadius: 'var(--zhd-radius)' }}
              className="px-4 py-2 text-xs font-semibold bg-[var(--zhd-accent)] text-[var(--zhd-accent-fg)] hover:bg-[var(--zhd-accent-hover)] flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Import Folder</span>
            </button>

            <label
              style={{ borderRadius: 'var(--zhd-radius)' }}
              className="px-4 py-2 text-xs font-medium border border-[var(--zhd-border)] bg-[var(--zhd-surface)] text-[var(--zhd-text)] hover:border-[var(--zhd-accent)] flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              <FilePlus2 className="w-4 h-4 text-[var(--zhd-accent)]" />
              <span>Add Files</span>
              <input
                type="file"
                multiple
                accept="audio/*,video/*,.mp3,.flac,.wav,.ogg,.m4a,.mp4,.webm,.mkv,.mov"
                className="hidden"
                onChange={(e) => {
                  onImportFiles(e.target.files);
                  e.currentTarget.value = '';
                }}
              />
            </label>
          </div>
        </div>

        {/* Drag-and-drop visual banner */}
        {isDragging && (
          <div className="p-8 border-2 border-dashed border-[var(--zhd-accent)] bg-[var(--zhd-surface)] flex items-center justify-center gap-3 text-sm font-medium text-[var(--zhd-text)]">
            <Upload className="w-5 h-5 text-[var(--zhd-accent)]" />
            <span>Drop media files or entire folders to import them into your ZHD2 library</span>
          </div>
        )}

        {/* Albums Grid View */}
        {activeTab === 'albums' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {albums.map((alb) => (
              <div
                key={alb.album}
                style={{ borderRadius: 'var(--zhd-radius)' }}
                className="bg-[var(--zhd-surface)] border border-[var(--zhd-border)] overflow-hidden flex flex-col"
              >
                <button
                  type="button"
                  onClick={() => onPlayItem(alb.items[0], true)}
                  className="relative aspect-square overflow-hidden group cursor-pointer bg-[var(--zhd-surface-2)]"
                >
                  <MediaArt
                    src={alb.artwork}
                    alt={alb.album}
                    className="w-full h-full group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute bottom-3 right-3 w-10 h-10 bg-[var(--zhd-accent)] text-[var(--zhd-accent-fg)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                </button>
                <div className="p-4 flex-1 flex flex-col justify-between gap-2">
                  <div>
                    <h3 className="font-display text-lg font-semibold text-[var(--zhd-text)] truncate">
                      {alb.album}
                    </h3>
                    <p className="text-xs text-[var(--zhd-muted)] truncate">
                      {alb.artist} · {alb.year} · {alb.items.length} tracks
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Artists View */}
        {activeTab === 'artists' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {artists.map((group) => (
              <div
                key={group.artist}
                style={{ borderRadius: 'var(--zhd-radius)' }}
                className="bg-[var(--zhd-surface)] border border-[var(--zhd-border)] p-5 flex gap-5"
              >
                <div className="w-24 h-24 shrink-0 overflow-hidden bg-[var(--zhd-surface-2)]">
                  <MediaArt src={group.artwork} alt={group.artist} className="w-full h-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-xl font-semibold text-[var(--zhd-text)] truncate">
                    {group.artist}
                  </h3>
                  <p className="text-xs text-[var(--zhd-muted)] mb-3">
                    {group.items.length} media items
                  </p>
                  <div className="flex flex-col divide-y divide-[var(--zhd-border)]">
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onPlayItem(item, true)}
                        className="py-1.5 flex items-center justify-between gap-3 text-left text-sm hover:text-[var(--zhd-accent)] cursor-pointer transition-colors"
                      >
                        <span className="truncate">{item.title}</span>
                        <span className="font-mono-num text-xs text-[var(--zhd-muted)] shrink-0">
                          {formatDuration(item.duration)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Videos Cinema Grid */}
        {activeTab === 'videos' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((video) => {
              const isCurrent = currentItem.id === video.id;
              return (
                <div
                  key={video.id}
                  style={{ borderRadius: 'var(--zhd-radius)' }}
                  className={`bg-[var(--zhd-surface)] border transition-colors overflow-hidden ${
                    isCurrent ? 'border-[var(--zhd-accent)]' : 'border-[var(--zhd-border)]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onPlayItem(video, true)}
                    className="relative aspect-video w-full overflow-hidden group cursor-pointer bg-black block"
                  >
                    <MediaArt
                      src={video.artwork}
                      alt={video.title}
                      type="video"
                      className="w-full h-full group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
                      <span>{video.format}</span>
                      <span className="font-mono-num">{formatDuration(video.duration)}</span>
                    </div>
                  </button>
                  <div className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-display text-base font-semibold text-[var(--zhd-text)] truncate">
                        {video.title}
                      </div>
                      <div className="text-xs text-[var(--zhd-muted)] truncate">
                        {video.artist} · {video.bitrate}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onPlayItem(video, true)}
                      style={{ borderRadius: 'var(--zhd-radius)' }}
                      className="px-3 py-1.5 text-xs font-semibold bg-[var(--zhd-accent)] text-[var(--zhd-accent-fg)] hover:bg-[var(--zhd-accent-hover)] whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Watch
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Songs & Local Files Compact High-Density Table */}
        {(activeTab === 'songs' || activeTab === 'local') && (
          <>
            {filteredItems.length === 0 ? (
              <div
                style={{ borderRadius: 'var(--zhd-radius)' }}
                className="p-12 border border-[var(--zhd-border)] bg-[var(--zhd-surface)] text-center flex flex-col items-center gap-3"
              >
                <Music className="w-8 h-8 text-[var(--zhd-muted)]" />
                <h3 className="font-display text-xl font-medium text-[var(--zhd-text)]">
                  {activeTab === 'local' ? 'No local media files imported yet' : 'No matching tracks'}
                </h3>
                <p className="text-sm text-[var(--zhd-muted)] max-w-md">
                  {activeTab === 'local'
                    ? 'Import individual MP3, FLAC, WAV, OGG, MP4, or WEBM files — or pick an entire folder (or drag and drop a folder here) to organize it into your ZHD2 library.'
                    : 'Try clearing your search query or importing local audio and video folders.'}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                  <button
                    type="button"
                    onClick={onTriggerFolderImport}
                    style={{ borderRadius: 'var(--zhd-radius)' }}
                    className="px-4 py-2 text-xs font-semibold bg-[var(--zhd-accent)] text-[var(--zhd-accent-fg)] hover:bg-[var(--zhd-accent-hover)] flex items-center gap-2 cursor-pointer"
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span>Import Folder</span>
                  </button>
                  <label
                    style={{ borderRadius: 'var(--zhd-radius)' }}
                    className="px-4 py-2 text-xs font-medium border border-[var(--zhd-border)] bg-[var(--zhd-bg)] text-[var(--zhd-text)] hover:border-[var(--zhd-accent)] flex items-center gap-2 cursor-pointer"
                  >
                    <FilePlus2 className="w-4 h-4 text-[var(--zhd-accent)]" />
                    <span>Add Files</span>
                    <input
                      type="file"
                      multiple
                      accept="audio/*,video/*,.mp3,.flac,.wav,.ogg,.m4a,.mp4,.webm,.mkv,.mov"
                      className="hidden"
                      onChange={(e) => {
                        onImportFiles(e.target.files);
                        e.currentTarget.value = '';
                      }}
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className="border border-[var(--zhd-border)] bg-[var(--zhd-surface)] overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--zhd-border)] text-xs font-medium text-[var(--zhd-muted)]">
                      <th className="py-3 px-4 w-12">#</th>
                      <th className="py-3 px-4">Title</th>
                      <th className="py-3 px-4 hidden sm:table-cell">Album / Folder</th>
                      <th className="py-3 px-4 hidden md:table-cell">Format</th>
                      <th className="py-3 px-4 text-right">Time</th>
                      <th className="py-3 px-4 w-24 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--zhd-border)] text-sm">
                    {filteredItems.map((item, idx) => {
                      const isCurrent = currentItem.id === item.id;
                      const isFav = favoriteIds.includes(item.id);
                      return (
                        <tr
                          key={item.id}
                          className={`group transition-colors ${
                            isCurrent
                              ? 'bg-[var(--zhd-surface-2)]'
                              : 'hover:bg-[var(--zhd-surface-2)]/60'
                          }`}
                        >
                          <td className="py-2.5 px-4 font-mono-num text-xs text-[var(--zhd-muted)]">
                            <button
                              type="button"
                              onClick={() => onPlayItem(item, false)}
                              aria-label={`Play ${item.title}`}
                              className="cursor-pointer hover:text-[var(--zhd-accent)]"
                            >
                              {isCurrent && isPlaying ? (
                                <span className="text-[var(--zhd-accent)] font-semibold">▶</span>
                              ) : (
                                String(idx + 1).padStart(2, '0')
                              )}
                            </button>
                          </td>
                          <td className="py-2.5 px-4">
                            <button
                              type="button"
                              onClick={() => onPlayItem(item, item.type === 'video')}
                              className="flex items-center gap-3 text-left cursor-pointer min-w-0"
                            >
                              <div className="w-9 h-9 shrink-0 overflow-hidden bg-[var(--zhd-surface-2)]">
                                <MediaArt
                                  src={item.artwork}
                                  alt={item.title}
                                  type={item.type}
                                  className="w-full h-full"
                                />
                              </div>
                              <div className="min-w-0">
                                <div
                                  className={`font-medium truncate ${
                                    isCurrent ? 'text-[var(--zhd-accent)]' : 'text-[var(--zhd-text)]'
                                  }`}
                                >
                                  {item.title}
                                </div>
                                <div className="text-xs text-[var(--zhd-muted)] truncate flex items-center gap-1.5">
                                  {item.type === 'video' && <Film className="w-3 h-3 shrink-0" />}
                                  <span>{item.artist}</span>
                                </div>
                              </div>
                            </button>
                          </td>
                          <td className="py-2.5 px-4 text-xs text-[var(--zhd-muted)] hidden sm:table-cell truncate max-w-[200px]">
                            {item.album}
                          </td>
                          <td className="py-2.5 px-4 text-xs text-[var(--zhd-muted)] hidden md:table-cell whitespace-nowrap">
                            {item.format} · {item.bitrate}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono-num text-xs text-[var(--zhd-muted)]">
                            {formatDuration(item.duration)}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => onToggleFavorite(item.id)}
                                aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                                className={`p-1.5 cursor-pointer transition-colors ${
                                  isFav
                                    ? 'text-[var(--zhd-accent)]'
                                    : 'text-[var(--zhd-muted)] hover:text-[var(--zhd-text)]'
                                }`}
                              >
                                <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                              </button>
                              {item.source === 'local' && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteLocalItem(item.id)}
                                  aria-label={`Remove ${item.title}`}
                                  className="p-1.5 text-[var(--zhd-muted)] hover:text-red-500 cursor-pointer transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
