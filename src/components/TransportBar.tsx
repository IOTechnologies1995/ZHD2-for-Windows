import {
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { MediaItem, RepeatMode } from '../types';
import { formatDuration } from '../utils/format';
import { MediaArt } from './MediaArt';

interface TransportBarProps {
  currentItem: MediaItem;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  shuffle: boolean;
  repeatMode: RepeatMode;
  eqEnabled: boolean;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onOpenNowPlaying: () => void;
  onOpenEqualizer: () => void;
}

export function TransportBar({
  currentItem,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  shuffle,
  repeatMode,
  eqEnabled,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleShuffle,
  onCycleRepeat,
  onOpenNowPlaying,
  onOpenEqualizer,
}: TransportBarProps) {
  const safeDuration = duration > 0 ? duration : currentItem.duration;
  const effectiveVolume = isMuted ? 0 : volume;

  return (
    <footer className="h-20 shrink-0 border-t border-[var(--zhd-border)] bg-[var(--zhd-surface)] px-6 flex items-center justify-between gap-6">
      {/* Left: Active Media Info */}
      <button
        type="button"
        onClick={onOpenNowPlaying}
        className="flex items-center gap-3.5 min-w-0 w-64 text-left cursor-pointer group"
        title="Open Now Playing"
      >
        <div className="w-12 h-12 shrink-0 overflow-hidden bg-[var(--zhd-surface-2)]">
          <MediaArt
            src={currentItem.artwork}
            alt={`${currentItem.title} artwork`}
            type={currentItem.type}
            className="w-full h-full group-hover:scale-105 transition-transform duration-200"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-[var(--zhd-text)] truncate group-hover:text-[var(--zhd-accent)] transition-colors">
            {currentItem.title}
          </div>
          <div className="text-xs text-[var(--zhd-muted)] truncate">
            {currentItem.artist} · {currentItem.type === 'video' ? 'Video' : currentItem.album}
          </div>
        </div>
      </button>

      {/* Center: Playback Controls & Timeline */}
      <div className="flex-1 max-w-2xl flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleShuffle}
            aria-label="Toggle shuffle"
            aria-pressed={shuffle}
            className={`w-8 h-8 flex items-center justify-center cursor-pointer transition-colors ${
              shuffle
                ? 'text-[var(--zhd-accent)]'
                : 'text-[var(--zhd-muted)] hover:text-[var(--zhd-text)]'
            }`}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onPrev}
            aria-label="Previous track"
            className="w-9 h-9 flex items-center justify-center text-[var(--zhd-text)] hover:text-[var(--zhd-accent)] cursor-pointer transition-colors"
          >
            <SkipBack className="w-4 h-4 fill-current" />
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            style={{ borderRadius: 'var(--zhd-radius)' }}
            className="w-10 h-10 flex items-center justify-center bg-[var(--zhd-accent)] text-[var(--zhd-accent-fg)] hover:bg-[var(--zhd-accent-hover)] cursor-pointer transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={onNext}
            aria-label="Next track"
            className="w-9 h-9 flex items-center justify-center text-[var(--zhd-text)] hover:text-[var(--zhd-accent)] cursor-pointer transition-colors"
          >
            <SkipForward className="w-4 h-4 fill-current" />
          </button>

          <button
            type="button"
            onClick={onCycleRepeat}
            aria-label={`Repeat mode: ${repeatMode}`}
            className={`w-8 h-8 flex items-center justify-center cursor-pointer transition-colors ${
              repeatMode !== 'off'
                ? 'text-[var(--zhd-accent)]'
                : 'text-[var(--zhd-muted)] hover:text-[var(--zhd-text)]'
            }`}
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-4 h-4" />
            ) : (
              <Repeat className="w-4 h-4" />
            )}
          </button>
        </div>

        <div className="w-full flex items-center gap-3">
          <span className="font-mono-num text-[11px] text-[var(--zhd-muted)] w-10 text-right shrink-0">
            {formatDuration(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={safeDuration}
            step={0.25}
            value={Math.min(currentTime, safeDuration)}
            onChange={(e) => onSeek(Number(e.target.value))}
            aria-label="Playback position"
            className="zhd-slider flex-1 h-4"
          />
          <span className="font-mono-num text-[11px] text-[var(--zhd-muted)] w-10 shrink-0">
            {formatDuration(safeDuration)}
          </span>
        </div>
      </div>

      {/* Right: EQ shortcut & Volume */}
      <div className="w-56 shrink-0 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onOpenEqualizer}
          title="Open 10-band Equalizer"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
            eqEnabled
              ? 'text-[var(--zhd-accent)] hover:bg-[var(--zhd-surface-2)]'
              : 'text-[var(--zhd-muted)] hover:text-[var(--zhd-text)]'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>EQ {eqEnabled ? 'On' : 'Off'}</span>
        </button>

        <button
          type="button"
          onClick={onToggleMute}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
          className="w-8 h-8 flex items-center justify-center text-[var(--zhd-muted)] hover:text-[var(--zhd-text)] cursor-pointer transition-colors"
        >
          {isMuted || volume === 0 ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </button>

        <input
          type="range"
          min={0}
          max={1}
          step={0.02}
          value={effectiveVolume}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          aria-label="Volume"
          className="zhd-slider w-24 h-4"
        />
      </div>
    </footer>
  );
}
