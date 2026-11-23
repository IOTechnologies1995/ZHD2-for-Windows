/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { audioPipeline } from './audio/audioPipeline';
import { getOrGenerateSynthTrackUrl } from './audio/synthEngine';
import { CustomizeView } from './components/CustomizeView';
import { EqualizerView } from './components/EqualizerView';
import { LibraryView } from './components/LibraryView';
import { NowPlayingView } from './components/NowPlayingView';
import { QuickplayHub } from './components/QuickplayHub';
import { ScreensaverOverlay } from './components/ScreensaverOverlay';
import { TopBar } from './components/TopBar';
import { TransportBar } from './components/TransportBar';
import { BUILTIN_MEDIA, EQ_PRESETS } from './data/library';
import { getColorScheme } from './data/themes';
import {
  deleteLocalMediaItem,
  loadConfig,
  loadLocalMediaItems,
  saveConfig,
  saveLocalMediaFile,
} from './storage/localStore';
import { MediaItem, NavSection, RepeatMode, ZhdConfig } from './types';
import { extractFilesFromFileList, ImportedFileEntry } from './utils/folderImport';

export default function App() {
  const [config, setConfig] = useState<ZhdConfig>(() => loadConfig());
  const [localItems, setLocalItems] = useState<MediaItem[]>([]);
  const [activeSection, setActiveSection] = useState<NavSection>('quickplay');
  const [importNotice, setImportNotice] = useState<string | null>(null);

  const mediaItems = useMemo(() => [...localItems, ...BUILTIN_MEDIA], [localItems]);

  const [currentId, setCurrentId] = useState<string>(BUILTIN_MEDIA[0].id);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number>(BUILTIN_MEDIA[0].duration);
  const [isMuted, setIsMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('all');

  // Screensaver state + idle countdown on Now Playing screen
  const [screensaverActive, setScreensaverActive] = useState(false);
  const [idleSecondsLeft, setIdleSecondsLeft] = useState<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const loadedMediaKeyRef = useRef<string>('');
  const noticeTimerRef = useRef<number | null>(null);

  const currentItem = useMemo(
    () => mediaItems.find((m) => m.id === currentId) ?? BUILTIN_MEDIA[0],
    [mediaItems, currentId]
  );

  const scheme = useMemo(() => getColorScheme(config.colorSchemeId), [config.colorSchemeId]);

  const usesVideoElement = currentItem.type === 'video' && currentItem.source === 'local';

  // Ensure webkitdirectory / directory attributes are applied to the hidden folder input
  useEffect(() => {
    const input = folderInputRef.current;
    if (!input) return;
    input.setAttribute('webkitdirectory', '');
    input.setAttribute('directory', '');
  }, []);

  // Hydrate persisted local IndexedDB media files & Electron config on mount
  useEffect(() => {
    void loadLocalMediaItems().then((items) => {
      if (items.length > 0) setLocalItems(items);
    });

    if (window.zhd2Desktop?.isDesktop) {
      void window.zhd2Desktop.loadConfig().then((desktopCfg) => {
        if (desktopCfg) setConfig((prev) => ({ ...prev, ...desktopCfg }));
      });
    }
  }, []);

  // Persist config changes
  useEffect(() => {
    saveConfig(config);
  }, [config]);

  // Apply Zune/Metro Theme CSS Custom Properties and dark/light class
  useEffect(() => {
    const root = document.documentElement;
    if (config.surfaceMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    root.style.setProperty('--zhd-accent', scheme.accent);
    root.style.setProperty('--zhd-accent-hover', scheme.accentHover);
    root.style.setProperty('--zhd-accent-fg', scheme.accentFg);
    root.style.setProperty('--zhd-radius', config.cornerStyle === 'sharp' ? '0px' : '4px');

    if (config.surfaceMode === 'dark' && scheme.darkBgTint && scheme.darkSurfaceTint) {
      root.style.setProperty('--zhd-bg', scheme.darkBgTint);
      root.style.setProperty('--zhd-surface', scheme.darkSurfaceTint);
    } else {
      root.style.removeProperty('--zhd-bg');
      root.style.removeProperty('--zhd-surface');
    }
  }, [config.surfaceMode, config.cornerStyle, scheme]);

  // Keep Web Audio 10-Band EQ synced with state
  useEffect(() => {
    audioPipeline.updateEq(
      config.eqEnabled,
      config.eqBands,
      config.preampDb,
      config.stereoBalance
    );
  }, [config.eqEnabled, config.eqBands, config.preampDb, config.stereoBalance]);

  const showImportNotice = useCallback((message: string) => {
    setImportNotice(message);
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => {
      setImportNotice(null);
    }, 4000);
  }, []);

  const updateConfig = useCallback((patch: Partial<ZhdConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const getActiveMediaElement = useCallback((): HTMLMediaElement | null => {
    return usesVideoElement ? videoRef.current : audioRef.current;
  }, [usesVideoElement]);

  // Sync media source when currentItem changes
  useEffect(() => {
    const key = `${currentItem.id}-${currentItem.source}-${usesVideoElement ? 'vid' : 'aud'}`;
    if (loadedMediaKeyRef.current === key) return;

    // Pause inactive element
    if (usesVideoElement && audioRef.current) {
      audioRef.current.pause();
    } else if (!usesVideoElement && videoRef.current) {
      videoRef.current.pause();
    }

    const targetEl = usesVideoElement ? videoRef.current : audioRef.current;
    if (!targetEl) {
      loadedMediaKeyRef.current = '';
      return;
    }

    let srcUrl = '';
    if (currentItem.source === 'local' && currentItem.objectUrl) {
      srcUrl = currentItem.objectUrl;
    } else {
      srcUrl = getOrGenerateSynthTrackUrl(
        currentItem.synthPreset ?? 0,
        currentItem.duration || 48
      );
    }

    loadedMediaKeyRef.current = key;
    targetEl.src = srcUrl;
    targetEl.volume = isMuted ? 0 : config.volume;
    targetEl.load();
    setCurrentTime(0);
    setDuration(currentItem.duration);

    if (isPlaying) {
      audioPipeline.attachElement(targetEl);
      audioPipeline.ensureContext();
      void targetEl.play().catch(() => {
        setIsPlaying(false);
      });
    }
  }, [currentItem, usesVideoElement, activeSection, isPlaying, isMuted, config.volume]);

  // Sync volume & mute to both elements
  useEffect(() => {
    const vol = isMuted ? 0 : config.volume;
    if (audioRef.current) audioRef.current.volume = vol;
    if (videoRef.current) videoRef.current.volume = vol;
  }, [config.volume, isMuted]);

  const handleSelectTrack = useCallback(
    (item: MediaItem, openNowPlaying = false) => {
      setCurrentId(item.id);
      setIsPlaying(true);
      setScreensaverActive(false);
      lastActivityRef.current = Date.now();
      if (openNowPlaying || item.type === 'video') {
        setActiveSection('now-playing');
      }
      setConfig((prev) => ({
        ...prev,
        recentIds: [item.id, ...prev.recentIds.filter((id) => id !== item.id)].slice(0, 8),
      }));
    },
    []
  );

  const handleNext = useCallback(() => {
    if (mediaItems.length === 0) return;
    if (shuffle && mediaItems.length > 1) {
      const candidates = mediaItems.filter((m) => m.id !== currentItem.id);
      const next = candidates[Math.floor(Math.random() * candidates.length)];
      if (next) handleSelectTrack(next, false);
      return;
    }
    const idx = mediaItems.findIndex((m) => m.id === currentItem.id);
    const nextIdx = (idx + 1) % mediaItems.length;
    handleSelectTrack(mediaItems[nextIdx], false);
  }, [mediaItems, currentItem.id, shuffle, handleSelectTrack]);

  const handlePrev = useCallback(() => {
    const el = getActiveMediaElement();
    if (el && el.currentTime > 3) {
      el.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    const idx = mediaItems.findIndex((m) => m.id === currentItem.id);
    const prevIdx = (idx - 1 + mediaItems.length) % mediaItems.length;
    handleSelectTrack(mediaItems[prevIdx], false);
  }, [getActiveMediaElement, mediaItems, currentItem.id, handleSelectTrack]);

  const handleTogglePlay = useCallback(() => {
    const el = getActiveMediaElement();
    if (!el) return;

    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      if (!el.src) {
        const srcUrl =
          currentItem.source === 'local' && currentItem.objectUrl
            ? currentItem.objectUrl
            : getOrGenerateSynthTrackUrl(currentItem.synthPreset ?? 0, currentItem.duration || 48);
        el.src = srcUrl;
      }
      audioPipeline.attachElement(el);
      audioPipeline.ensureContext();
      void el
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  }, [getActiveMediaElement, isPlaying, currentItem]);

  const handleSeek = useCallback(
    (time: number) => {
      const el = getActiveMediaElement();
      if (el && Number.isFinite(time)) {
        el.currentTime = time;
      }
      setCurrentTime(time);
    },
    [getActiveMediaElement]
  );

  // Bind timeupdate / loadedmetadata / ended listeners to active media element
  useEffect(() => {
    const el = usesVideoElement ? videoRef.current : audioRef.current;
    if (!el) return;

    const onTimeUpdate = () => setCurrentTime(el.currentTime || 0);
    const onLoadedMeta = () => {
      if (Number.isFinite(el.duration) && el.duration > 0) {
        setDuration(el.duration);
      }
    };
    const onEnded = () => {
      if (repeatMode === 'one') {
        el.currentTime = 0;
        void el.play();
      } else if (repeatMode === 'all') {
        handleNext();
      } else {
        setIsPlaying(false);
      }
    };

    el.addEventListener('timeupdate', onTimeUpdate);
    el.addEventListener('loadedmetadata', onLoadedMeta);
    el.addEventListener('ended', onEnded);

    return () => {
      el.removeEventListener('timeupdate', onTimeUpdate);
      el.removeEventListener('loadedmetadata', onLoadedMeta);
      el.removeEventListener('ended', onEnded);
    };
  }, [usesVideoElement, activeSection, repeatMode, handleNext]);

  // Automatic Idle Screensaver Timer while on the Now Playing screen
  useEffect(() => {
    if (
      activeSection !== 'now-playing' ||
      config.screensaverTimeoutSec <= 0 ||
      screensaverActive
    ) {
      setIdleSecondsLeft(null);
      return;
    }

    lastActivityRef.current = Date.now();
    const resetIdle = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('mousemove', resetIdle);
    window.addEventListener('mousedown', resetIdle);
    window.addEventListener('keydown', resetIdle);
    window.addEventListener('touchstart', resetIdle);

    const interval = window.setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      const remaining = Math.max(0, config.screensaverTimeoutSec - elapsedSec);
      setIdleSecondsLeft(remaining);
      if (remaining === 0) {
        setScreensaverActive(true);
      }
    }, 500);

    return () => {
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('mousedown', resetIdle);
      window.removeEventListener('keydown', resetIdle);
      window.removeEventListener('touchstart', resetIdle);
      window.clearInterval(interval);
    };
  }, [activeSection, config.screensaverTimeoutSec, screensaverActive]);

  // Global keyboard shortcuts (Space to play/pause when not typing in an input)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleTogglePlay]);

  const handleImportEntries = useCallback(
    async (entries: ImportedFileEntry[]): Promise<number> => {
      if (entries.length === 0) {
        showImportNotice('No supported audio or video files found in the selection.');
        return 0;
      }

      const imported: MediaItem[] = [];
      for (const entry of entries) {
        const item = await saveLocalMediaFile(entry.file, entry.folderName);
        imported.push(item);
      }

      if (imported.length > 0) {
        setLocalItems((prev) => [...imported, ...prev]);
        const uniqueFolders = Array.from(
          new Set(entries.map((e) => e.folderName).filter(Boolean))
        );
        const label =
          uniqueFolders.length === 1
            ? `Imported ${imported.length} media ${imported.length === 1 ? 'file' : 'files'} from "${uniqueFolders[0]}"`
            : uniqueFolders.length > 1
            ? `Imported ${imported.length} media files across ${uniqueFolders.length} folders`
            : `Imported ${imported.length} local media ${imported.length === 1 ? 'file' : 'files'}`;
        showImportNotice(label);
        handleSelectTrack(imported[0], imported[0].type === 'video');
      }

      return imported.length;
    },
    [handleSelectTrack, showImportNotice]
  );

  const handleImportFiles = useCallback(
    async (files: FileList | null): Promise<number> => {
      const entries = extractFilesFromFileList(files);
      return handleImportEntries(entries);
    },
    [handleImportEntries]
  );

  const handleTriggerFolderImport = useCallback(() => {
    folderInputRef.current?.click();
  }, []);

  const handleDeleteLocalItem = useCallback(
    (id: string) => {
      void deleteLocalMediaItem(id);
      setLocalItems((prev) => prev.filter((item) => item.id !== id));
      if (currentId === id) {
        setCurrentId(BUILTIN_MEDIA[0].id);
        setIsPlaying(false);
      }
    },
    [currentId]
  );

  const handleToggleFavorite = useCallback((id: string) => {
    setConfig((prev) => {
      const exists = prev.favoriteIds.includes(id);
      return {
        ...prev,
        favoriteIds: exists
          ? prev.favoriteIds.filter((f) => f !== id)
          : [...prev.favoriteIds, id],
      };
    });
  }, []);

  const handleSelectEqPreset = useCallback((presetId: string) => {
    const preset = EQ_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setConfig((prev) => ({
      ...prev,
      eqEnabled: true,
      eqPresetId: preset.id,
      eqBands: [...preset.gains],
    }));
  }, []);

  const handleChangeEqBand = useCallback((idx: number, gain: number) => {
    setConfig((prev) => {
      const next = [...prev.eqBands];
      next[idx] = gain;
      return {
        ...prev,
        eqPresetId: 'custom',
        eqBands: next,
      };
    });
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[var(--zhd-bg)] text-[var(--zhd-text)]">
      {/* Shared hidden HTMLAudioElement for music and built-in video soundtracks */}
      <audio ref={audioRef} preload="metadata" crossOrigin="anonymous" />

      {/* Shared hidden folder picker supporting nested directories */}
      <input
        ref={folderInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          void handleImportFiles(e.target.files);
          e.currentTarget.value = '';
        }}
      />

      {/* Top 3-Zone Navigation Bar */}
      <TopBar
        activeSection={activeSection}
        onNavigate={setActiveSection}
        onTriggerFolderImport={handleTriggerFolderImport}
      />

      {/* Quiet feedback bar after importing files or folders */}
      {importNotice && (
        <div
          role="status"
          className="px-6 py-2 bg-[var(--zhd-surface-2)] border-b border-[var(--zhd-border)] flex items-center justify-between text-xs text-[var(--zhd-text)]"
        >
          <span>{importNotice}</span>
          <button
            type="button"
            onClick={() => setImportNotice(null)}
            className="text-[var(--zhd-muted)] hover:text-[var(--zhd-text)] cursor-pointer ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Viewport Workspace */}
      <main className="flex-1 min-h-0 overflow-hidden">
        {activeSection === 'quickplay' && (
          <QuickplayHub
            mediaItems={mediaItems}
            currentItem={currentItem}
            isPlaying={isPlaying}
            config={config}
            scheme={scheme}
            onNavigate={setActiveSection}
            onPlayItem={handleSelectTrack}
            onImportFiles={(files) => {
              void handleImportFiles(files);
            }}
            onTriggerFolderImport={handleTriggerFolderImport}
            onLaunchScreensaver={() => setScreensaverActive(true)}
          />
        )}

        {activeSection === 'library' && (
          <LibraryView
            mediaItems={mediaItems}
            currentItem={currentItem}
            isPlaying={isPlaying}
            favoriteIds={config.favoriteIds}
            onPlayItem={handleSelectTrack}
            onToggleFavorite={handleToggleFavorite}
            onImportFiles={(files) => {
              void handleImportFiles(files);
            }}
            onImportEntries={(entries) => {
              void handleImportEntries(entries);
            }}
            onTriggerFolderImport={handleTriggerFolderImport}
            onDeleteLocalItem={handleDeleteLocalItem}
          />
        )}

        {activeSection === 'now-playing' && (
          <NowPlayingView
            currentItem={currentItem}
            queue={mediaItems}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            isFavorite={config.favoriteIds.includes(currentItem.id)}
            scheme={scheme}
            screensaverTimeoutSec={config.screensaverTimeoutSec}
            idleSecondsLeft={idleSecondsLeft}
            videoRef={videoRef}
            onTogglePlay={handleTogglePlay}
            onSelectTrack={(item) => handleSelectTrack(item, false)}
            onToggleFavorite={handleToggleFavorite}
            onLaunchScreensaver={() => setScreensaverActive(true)}
            onOpenEqualizer={() => setActiveSection('equalizer')}
          />
        )}

        {activeSection === 'equalizer' && (
          <EqualizerView
            enabled={config.eqEnabled}
            presetId={config.eqPresetId}
            bands={config.eqBands}
            preampDb={config.preampDb}
            stereoBalance={config.stereoBalance}
            isPlaying={isPlaying}
            scheme={scheme}
            onToggleEnabled={() => updateConfig({ eqEnabled: !config.eqEnabled })}
            onSelectPreset={handleSelectEqPreset}
            onChangeBand={handleChangeEqBand}
            onChangePreamp={(preampDb) => updateConfig({ preampDb })}
            onChangeBalance={(stereoBalance) => updateConfig({ stereoBalance })}
            onResetFlat={() => handleSelectEqPreset('flat')}
          />
        )}

        {activeSection === 'customize' && (
          <CustomizeView
            config={config}
            onUpdateConfig={updateConfig}
            onLaunchScreensaver={() => setScreensaverActive(true)}
          />
        )}
      </main>

      {/* Persistent Zune HD Transport Bar */}
      <TransportBar
        currentItem={currentItem}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={config.volume}
        isMuted={isMuted}
        shuffle={shuffle}
        repeatMode={repeatMode}
        eqEnabled={config.eqEnabled}
        onTogglePlay={handleTogglePlay}
        onPrev={handlePrev}
        onNext={handleNext}
        onSeek={handleSeek}
        onVolumeChange={(vol) => {
          setIsMuted(false);
          updateConfig({ volume: vol });
        }}
        onToggleMute={() => setIsMuted((m) => !m)}
        onToggleShuffle={() => setShuffle((s) => !s)}
        onCycleRepeat={() =>
          setRepeatMode((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off'))
        }
        onOpenNowPlaying={() => setActiveSection('now-playing')}
        onOpenEqualizer={() => setActiveSection('equalizer')}
      />

      {/* Fullscreen Now Playing Screensaver Overlay */}
      {screensaverActive && (
        <ScreensaverOverlay
          mode={config.screensaverMode}
          currentItem={currentItem}
          mediaItems={mediaItems}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          scheme={scheme}
          onExit={() => {
            setScreensaverActive(false);
            lastActivityRef.current = Date.now();
          }}
          onTogglePlay={handleTogglePlay}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      )}
    </div>
  );
}
