import {
  Disc3,
  FilePlus2,
  Film,
  FolderOpen,
  MonitorPlay,
  Palette,
  Play,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { ColorScheme, MediaItem, NavSection, ZhdConfig } from '../types';
import { formatDuration } from '../utils/format';
import { MediaArt } from './MediaArt';

interface QuickplayHubProps {
  mediaItems: MediaItem[];
  currentItem: MediaItem;
  isPlaying: boolean;
  config: ZhdConfig;
  scheme: ColorScheme;
  onNavigate: (section: NavSection) => void;
  onPlayItem: (item: MediaItem, openNowPlaying?: boolean) => void;
  onImportFiles: (files: FileList | null) => void;
  onTriggerFolderImport: () => void;
  onLaunchScreensaver: () => void;
}

export function QuickplayHub({
  mediaItems,
  currentItem,
  isPlaying,
  config,
  scheme,
  onNavigate,
  onPlayItem,
  onImportFiles,
  onTriggerFolderImport,
  onLaunchScreensaver,
}: QuickplayHubProps) {
  const musicItems = mediaItems.filter((m) => m.type === 'audio');
  const videoItems = mediaItems.filter((m) => m.type === 'video');
  const localItems = mediaItems.filter((m) => m.source === 'local');
  const importedFolderCount = new Set(
    localItems.map((i) => i.folderName).filter(Boolean)
  ).size;

  const recentItems = config.recentIds
    .map((id) => mediaItems.find((m) => m.id === id))
    .filter((item): item is MediaItem => Boolean(item))
    .slice(0, 4);

  const zuneMenuLinks: Array<{ label: string; count?: string; action: () => void }> = [
    { label: 'music', count: `${musicItems.length} tracks`, action: () => onNavigate('library') },
    { label: 'videos', count: `${videoItems.length} reels`, action: () => onNavigate('library') },
    { label: 'now playing', count: isPlaying ? 'playing' : 'paused', action: () => onNavigate('now-playing') },
    { label: 'equalizer', count: config.eqEnabled ? 'active' : 'bypass', action: () => onNavigate('equalizer') },
    { label: 'customize', count: scheme.origin, action: () => onNavigate('customize') },
  ];

  return (
    <div className="h-full overflow-y-auto px-6 lg:px-10 py-8">
      <div className="max-w-[1380px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Column: Authentic Zune 30GB / Zune HD Typographic Vertical Spine */}
        <aside className="lg:col-span-3 flex flex-col gap-6">
          <div>
            <p className="text-xs font-medium text-[var(--zhd-muted)] mb-2">
              Zune HD · Metro Desktop
            </p>
            <h1 className="font-display text-4xl font-light tracking-tight text-[var(--zhd-text)] leading-none">
              quickplay
            </h1>
          </div>

          <nav aria-label="Zune Menu" className="flex flex-col border-t border-[var(--zhd-border)]">
            {zuneMenuLinks.map((link) => (
              <button
                key={link.label}
                type="button"
                onClick={link.action}
                className="group flex items-baseline justify-between py-3.5 border-b border-[var(--zhd-border)] text-left cursor-pointer transition-colors hover:text-[var(--zhd-accent)]"
              >
                <span className="font-display text-2xl font-light tracking-tight group-hover:translate-x-1 transition-transform duration-150">
                  {link.label}
                </span>
                {link.count && (
                  <span className="text-xs text-[var(--zhd-muted)] font-mono-num">
                    {link.count}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Local Folder & File Import Triggers */}
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={onTriggerFolderImport}
              style={{ borderRadius: 'var(--zhd-radius)' }}
              className="flex items-center justify-center gap-2.5 px-4 py-3 bg-[var(--zhd-accent)] text-[var(--zhd-accent-fg)] hover:bg-[var(--zhd-accent-hover)] text-sm font-semibold cursor-pointer transition-colors"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Import Media Folder</span>
            </button>

            <label
              style={{ borderRadius: 'var(--zhd-radius)' }}
              className="flex items-center justify-center gap-2.5 px-4 py-3 border border-[var(--zhd-border)] bg-[var(--zhd-surface)] hover:border-[var(--zhd-accent)] text-sm font-medium text-[var(--zhd-text)] cursor-pointer transition-colors"
            >
              <FilePlus2 className="w-4 h-4 text-[var(--zhd-accent)]" />
              <span>Import Audio & Video Files</span>
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
        </aside>

        {/* Right Column: Windows 8 Metro Architectural Live Tile Canvas */}
        <section className="lg:col-span-9 flex flex-col gap-8">
          <div className="grid grid-cols-1 md:grid-cols-6 auto-rows-[168px] gap-3">
            {/* Tile 1 (4x2): Hero Now Playing Live Tile */}
            <button
              type="button"
              onClick={() => onNavigate('now-playing')}
              style={{ borderRadius: 'var(--zhd-radius)' }}
              className="md:col-span-4 md:row-span-2 relative overflow-hidden group text-left cursor-pointer bg-[var(--zhd-surface)] border border-[var(--zhd-border)]"
            >
              <MediaArt
                src={currentItem.artwork}
                alt={currentItem.title}
                type={currentItem.type}
                className="absolute inset-0 w-full h-full group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/15" />
              <div className="relative h-full p-6 flex flex-col justify-between text-white">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium tracking-wide text-white/85">
                    Now Playing · {currentItem.type === 'video' ? 'Video' : 'Music'}
                  </span>
                  <span className="font-mono-num text-xs text-white/80">
                    {formatDuration(currentItem.duration)}
                  </span>
                </div>

                <div>
                  <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight leading-tight text-balance">
                    {currentItem.title}
                  </h2>
                  <p className="text-sm text-white/85 mt-1">
                    {currentItem.artist} · {currentItem.album} · {currentItem.format}
                  </p>
                </div>
              </div>
            </button>

            {/* Tile 2 (2x1): Import Local Folder Metro Tile */}
            <button
              type="button"
              onClick={onTriggerFolderImport}
              style={{
                borderRadius: 'var(--zhd-radius)',
                backgroundColor: scheme.accent,
                color: scheme.accentFg,
              }}
              className="md:col-span-2 p-5 flex flex-col justify-between text-left cursor-pointer hover:brightness-95 transition-all"
            >
              <div className="flex items-center justify-between">
                <FolderOpen className="w-6 h-6" />
                <span className="font-mono-num text-xs opacity-90">
                  {importedFolderCount > 0 ? `${importedFolderCount} folders` : `${localItems.length} local`}
                </span>
              </div>
              <div>
                <div className="font-display text-xl font-semibold leading-tight">
                  Import Folder
                </div>
                <div className="text-xs opacity-90 mt-1">
                  Scan albums, music & video directories
                </div>
              </div>
            </button>

            {/* Tile 3 (2x1): 10-Band Equalizer Live Curve Tile */}
            <button
              type="button"
              onClick={() => onNavigate('equalizer')}
              style={{
                borderRadius: 'var(--zhd-radius)',
                backgroundColor: scheme.secondaryTile,
                color: '#FFFFFF',
              }}
              className="md:col-span-2 p-5 flex flex-col justify-between text-left cursor-pointer hover:brightness-110 transition-all"
            >
              <div className="flex items-center justify-between">
                <SlidersHorizontal className="w-5 h-5" />
                <span className="text-xs opacity-85">
                  {config.eqEnabled ? '10-Band Active' : 'Bypassed'}
                </span>
              </div>

              {/* Mini EQ bar preview */}
              <div className="flex items-end gap-1.5 h-10 my-1">
                {config.eqBands.map((gain, i) => {
                  const pct = Math.max(14, Math.min(100, ((gain + 12) / 24) * 100));
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-white/85"
                      style={{ height: `${pct}%` }}
                    />
                  );
                })}
              </div>

              <div className="flex items-baseline justify-between">
                <span className="font-display text-base font-semibold">Equalizer</span>
                <span className="text-xs opacity-85 capitalize">
                  {config.eqPresetId.replace('-', ' ')}
                </span>
              </div>
            </button>

            {/* Tile 4 (2x1): Music Library Tile */}
            <button
              type="button"
              onClick={() => onNavigate('library')}
              style={{ borderRadius: 'var(--zhd-radius)' }}
              className="md:col-span-2 p-5 bg-[var(--zhd-surface)] border border-[var(--zhd-border)] hover:border-[var(--zhd-accent)] flex flex-col justify-between text-left cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between text-[var(--zhd-accent)]">
                <Disc3 className="w-6 h-6" />
                <span className="font-mono-num text-xs text-[var(--zhd-muted)]">
                  {musicItems.length} tracks
                </span>
              </div>
              <div>
                <div className="font-display text-lg font-semibold text-[var(--zhd-text)]">
                  Music Collection
                </div>
                <div className="text-xs text-[var(--zhd-muted)] mt-0.5">
                  FLAC, WAV & {localItems.filter((i) => i.type === 'audio').length} local files
                </div>
              </div>
            </button>

            {/* Tile 5 (2x1): Video Cinema Tile */}
            <button
              type="button"
              onClick={() => {
                const firstVid = videoItems[0];
                if (firstVid) onPlayItem(firstVid, true);
                else onNavigate('library');
              }}
              style={{ borderRadius: 'var(--zhd-radius)' }}
              className="md:col-span-2 p-5 bg-[var(--zhd-surface)] border border-[var(--zhd-border)] hover:border-[var(--zhd-accent)] flex flex-col justify-between text-left cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between text-[var(--zhd-accent)]">
                <Film className="w-6 h-6" />
                <span className="font-mono-num text-xs text-[var(--zhd-muted)]">
                  {videoItems.length} videos
                </span>
              </div>
              <div>
                <div className="font-display text-lg font-semibold text-[var(--zhd-text)]">
                  Video Cinema
                </div>
                <div className="text-xs text-[var(--zhd-muted)] mt-0.5">
                  MP4, WEBM & HD visual reels
                </div>
              </div>
            </button>

            {/* Tile 6 (1x1): Screensaver Instant Trigger */}
            <button
              type="button"
              onClick={onLaunchScreensaver}
              style={{ borderRadius: 'var(--zhd-radius)' }}
              className="md:col-span-1 p-4 bg-[var(--zhd-surface)] border border-[var(--zhd-border)] hover:border-[var(--zhd-accent)] flex flex-col justify-between text-left cursor-pointer transition-colors"
            >
              <MonitorPlay className="w-5 h-5 text-[var(--zhd-accent)]" />
              <div>
                <div className="font-display text-sm font-semibold text-[var(--zhd-text)] leading-tight">
                  Screensaver
                </div>
                <div className="text-[11px] text-[var(--zhd-muted)] mt-0.5 font-mono-num">
                  {config.screensaverTimeoutSec > 0
                    ? `${config.screensaverTimeoutSec}s idle`
                    : 'Manual'}
                </div>
              </div>
            </button>

            {/* Tile 7 (1x1): Theme & Customize */}
            <button
              type="button"
              onClick={() => onNavigate('customize')}
              style={{ borderRadius: 'var(--zhd-radius)' }}
              className="md:col-span-1 p-4 bg-[var(--zhd-surface)] border border-[var(--zhd-border)] hover:border-[var(--zhd-accent)] flex flex-col justify-between text-left cursor-pointer transition-colors"
            >
              <Palette className="w-5 h-5 text-[var(--zhd-accent)]" />
              <div>
                <div className="font-display text-sm font-semibold text-[var(--zhd-text)] leading-tight">
                  Themes
                </div>
                <div className="text-[11px] text-[var(--zhd-muted)] mt-0.5 truncate">
                  {config.surfaceMode === 'dark' ? 'Metro Dark' : 'Zune Light'}
                </div>
              </div>
            </button>
          </div>

          {/* Recently Played Strip */}
          <div>
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="font-display text-xl font-light text-[var(--zhd-text)]">
                recently played
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('library')}
                className="text-xs font-medium text-[var(--zhd-accent)] hover:underline cursor-pointer"
              >
                View full collection
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {recentItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onPlayItem(item, true)}
                  style={{ borderRadius: 'var(--zhd-radius)' }}
                  className="group text-left bg-[var(--zhd-surface)] border border-[var(--zhd-border)] hover:border-[var(--zhd-accent)] transition-colors cursor-pointer overflow-hidden"
                >
                  <div className="relative aspect-square overflow-hidden bg-[var(--zhd-surface-2)]">
                    <MediaArt
                      src={item.artwork}
                      alt={item.title}
                      type={item.type}
                      className="w-full h-full group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute bottom-2 right-2 w-8 h-8 flex items-center justify-center bg-black/75 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="text-sm font-semibold text-[var(--zhd-text)] truncate">
                      {item.title}
                    </div>
                    <div className="text-xs text-[var(--zhd-muted)] truncate mt-0.5">
                      {item.artist} · {formatDuration(item.duration)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quiet info line */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[var(--zhd-border)] text-xs text-[var(--zhd-muted)]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--zhd-accent)] shrink-0" />
              <span>
                Leave the Now Playing screen idle for{' '}
                <span className="font-mono-num text-[var(--zhd-text)]">
                  {config.screensaverTimeoutSec > 0 ? `${config.screensaverTimeoutSec}s` : 'manual launch'}
                </span>{' '}
                to activate your selected ZHD2 screensaver.
              </span>
            </div>
            <span className="font-mono-num">
              {mediaItems.length} total items ({localItems.length} imported locally)
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
