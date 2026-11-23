import { RefObject, useEffect, useRef, useState } from 'react';
import {
  Heart,
  Maximize2,
  MonitorPlay,
  Pause,
  Play,
  SkipForward,
  SlidersHorizontal,
} from 'lucide-react';
import { audioPipeline } from '../audio/audioPipeline';
import { ColorScheme, MediaItem } from '../types';
import { formatDuration } from '../utils/format';
import { MediaArt } from './MediaArt';

interface NowPlayingViewProps {
  currentItem: MediaItem;
  queue: MediaItem[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isFavorite: boolean;
  scheme: ColorScheme;
  screensaverTimeoutSec: number;
  idleSecondsLeft: number | null;
  videoRef: RefObject<HTMLVideoElement | null>;
  onTogglePlay: () => void;
  onSelectTrack: (item: MediaItem) => void;
  onToggleFavorite: (id: string) => void;
  onLaunchScreensaver: () => void;
  onOpenEqualizer: () => void;
}

export function NowPlayingView({
  currentItem,
  queue,
  isPlaying,
  currentTime,
  duration,
  isFavorite,
  scheme,
  screensaverTimeoutSec,
  idleSecondsLeft,
  videoRef,
  onTogglePlay,
  onSelectTrack,
  onToggleFavorite,
  onLaunchScreensaver,
  onOpenEqualizer,
}: NowPlayingViewProps) {
  const fftCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageContainerRef = useRef<HTMLDivElement | null>(null);
  const [videoFit, setVideoFit] = useState<'contain' | 'cover'>('cover');

  const isLocalVideo = currentItem.type === 'video' && currentItem.source === 'local';
  const isBuiltinVideo = currentItem.type === 'video' && currentItem.source === 'builtin';

  // Live FFT spectrum visualizer for Audio mode
  useEffect(() => {
    if (currentItem.type !== 'audio') return;
    const canvas = fftCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const freqData = new Uint8Array(new ArrayBuffer(128));

    const draw = (time: number) => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const hasLive = isPlaying && audioPipeline.getFrequencyData(freqData);
      const barCount = 44;
      const gap = 3;
      const barWidth = (width - gap * (barCount - 1)) / barCount;

      for (let i = 0; i < barCount; i++) {
        let energy = 0.08;
        if (hasLive) {
          const bin = Math.min(freqData.length - 1, Math.floor((i / barCount) * 72));
          energy = Math.max(0.06, freqData[bin] / 255);
        } else if (isPlaying) {
          energy = 0.18 + 0.35 * Math.abs(Math.sin(time * 0.004 + i * 0.35));
        }

        const barH = Math.max(3, energy * (height - 4));
        const x = i * (barWidth + gap);
        const y = height - barH;

        ctx.fillStyle = i % 5 === 0 ? scheme.accent : 'rgba(255, 255, 255, 0.72)';
        ctx.fillRect(x, y, barWidth, barH);
      }

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [currentItem.type, isPlaying, scheme.accent]);

  // Synchronized HD Procedural Canvas Video Stage for Built-In Video Reels
  useEffect(() => {
    if (!isBuiltinVideo) return;
    const canvas = videoCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = currentItem.artwork;

    let rafId = 0;
    const freqData = new Uint8Array(new ArrayBuffer(128));

    const renderFrame = (now: number) => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, w, h);

      const t = isPlaying ? now * 0.0005 : currentTime * 0.4;
      const hasLive = isPlaying && audioPipeline.getFrequencyData(freqData);
      let bass = 0;
      if (hasLive) {
        for (let i = 0; i < 12; i++) bass += freqData[i];
        bass = bass / (12 * 255);
      }

      // Ken Burns architectural camera drift on high-res artwork
      if (img.complete && img.naturalWidth > 0) {
        const zoom = 1.08 + 0.06 * Math.sin(t * 0.65) + bass * 0.03;
        const drawW = w * zoom;
        const drawH = h * zoom;
        const offsetX = (w - drawW) / 2 + Math.sin(t * 0.45) * 28;
        const offsetY = (h - drawH) / 2 + Math.cos(t * 0.35) * 16;
        ctx.save();
        ctx.globalAlpha = 0.84;
        ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
        ctx.restore();
      }

      // Architectural light shafts & Metro motion bars synced to audio
      ctx.save();
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, 'rgba(0,0,0,0.55)');
      grad.addColorStop(0.5, 'rgba(0,0,0,0.12)');
      grad.addColorStop(1, 'rgba(0,0,0,0.75)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Sweeping geometric light bands
      for (let i = 0; i < 4; i++) {
        const xPos = ((t * 95 + i * 260) % (w + 300)) - 150;
        ctx.fillStyle = i % 2 === 0 ? `${scheme.accent}22` : 'rgba(255,255,255,0.05)';
        ctx.beginPath();
        ctx.moveTo(xPos, 0);
        ctx.lineTo(xPos + 90, 0);
        ctx.lineTo(xPos - 80, h);
        ctx.lineTo(xPos - 170, h);
        ctx.closePath();
        ctx.fill();
      }

      // Bottom audio-reactive hairline waveform inside the cinema frame
      const bars = 64;
      const bw = w / bars;
      for (let i = 0; i < bars; i++) {
        const mag = hasLive
          ? freqData[Math.floor((i / bars) * 90)] / 255
          : isPlaying
          ? 0.2 + 0.25 * Math.abs(Math.sin(t * 6 + i * 0.28))
          : 0.05;
        const bh = mag * 46;
        ctx.fillStyle = i % 8 === 0 ? scheme.accent : 'rgba(255,255,255,0.45)';
        ctx.fillRect(i * bw + 1, h - bh, Math.max(1, bw - 2), bh);
      }
      ctx.restore();

      rafId = requestAnimationFrame(renderFrame);
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafId);
  }, [isBuiltinVideo, currentItem.artwork, isPlaying, currentTime, scheme.accent]);

  const handleFullscreen = () => {
    const target = isLocalVideo ? videoRef.current : stageContainerRef.current;
    if (!target) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else if (target.requestFullscreen) {
      void target.requestFullscreen();
    }
  };

  const currentIdx = queue.findIndex((m) => m.id === currentItem.id);
  const upNext =
    currentIdx >= 0
      ? [...queue.slice(currentIdx + 1), ...queue.slice(0, currentIdx)].slice(0, 7)
      : queue.slice(0, 7);

  return (
    <div className="h-full overflow-y-auto px-6 lg:px-10 py-8">
      <div className="max-w-[1380px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Focal Stage (8 cols) */}
        <section className="lg:col-span-8 flex flex-col gap-5">
          {/* Header Row */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-[var(--zhd-muted)]">
                Now Playing · {currentItem.type === 'video' ? 'Cinema Stage' : 'Hi-Res Audio'}
              </p>
              <h1 className="font-display text-3xl sm:text-4xl font-light tracking-tight text-[var(--zhd-text)] mt-1">
                {currentItem.title}
              </h1>
            </div>

            <div className="flex items-center gap-2.5">
              {screensaverTimeoutSec > 0 && idleSecondsLeft !== null && (
                <span className="font-mono-num text-xs text-[var(--zhd-muted)] mr-1">
                  Screensaver in {idleSecondsLeft}s
                </span>
              )}
              <button
                type="button"
                onClick={onLaunchScreensaver}
                style={{ borderRadius: 'var(--zhd-radius)' }}
                className="px-3.5 py-2 text-xs font-semibold bg-[var(--zhd-accent)] text-[var(--zhd-accent-fg)] hover:bg-[var(--zhd-accent-hover)] flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              >
                <MonitorPlay className="w-3.5 h-3.5" />
                <span>Launch Screensaver</span>
              </button>
            </div>
          </div>

          {/* Focal Visual Viewport (Video or Zune HD Album Stage) */}
          <div
            ref={stageContainerRef}
            style={{ borderRadius: 'var(--zhd-radius)' }}
            className="relative w-full aspect-video bg-black border border-[var(--zhd-border)] overflow-hidden"
          >
            {isLocalVideo ? (
              <video
                ref={videoRef}
                playsInline
                onClick={onTogglePlay}
                className={`w-full h-full cursor-pointer ${
                  videoFit === 'cover' ? 'object-cover' : 'object-contain'
                }`}
              />
            ) : isBuiltinVideo ? (
              <>
                <canvas
                  ref={videoCanvasRef}
                  width={960}
                  height={540}
                  onClick={onTogglePlay}
                  className="w-full h-full object-cover cursor-pointer block"
                />
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-white pointer-events-none">
                  <span className="text-xs font-medium bg-black/55 px-2.5 py-1">
                    {currentItem.album} · {currentItem.format}
                  </span>
                  <span className="font-mono-num text-xs bg-black/55 px-2.5 py-1">
                    {formatDuration(currentTime)} / {formatDuration(duration || currentItem.duration)}
                  </span>
                </div>
              </>
            ) : (
              /* Iconic Zune HD Full-Bleed Audio Stage */
              <div className="relative w-full h-full flex items-center p-6 sm:p-10">
                {/* Ambient blurred backdrop with measured dark scrim */}
                <MediaArt
                  src={currentItem.artwork}
                  alt=""
                  className="absolute inset-0 w-full h-full scale-110 blur-2xl opacity-45"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/80" />

                <div className="relative z-10 w-full grid grid-cols-1 sm:grid-cols-12 gap-8 items-center text-white">
                  <div className="sm:col-span-5">
                    <div className="aspect-square max-w-[260px] shadow-2xl border border-white/15 overflow-hidden bg-black">
                      <MediaArt
                        src={currentItem.artwork}
                        alt={currentItem.album}
                        className="w-full h-full"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-7 flex flex-col gap-4">
                    <div>
                      <div className="text-xs font-medium text-white/70">
                        {currentItem.genre} · {currentItem.year} · {currentItem.format}
                      </div>
                      <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight leading-tight mt-1 text-balance">
                        {currentItem.title}
                      </h2>
                      <p className="text-base text-white/85 mt-1">
                        {currentItem.artist} — {currentItem.album}
                      </p>
                    </div>

                    {/* Live Web Audio FFT Visualizer */}
                    <div className="pt-2">
                      <canvas
                        ref={fftCanvasRef}
                        width={440}
                        height={72}
                        className="w-full h-[72px] block"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={onTogglePlay}
                        style={{ borderRadius: 'var(--zhd-radius)' }}
                        className="px-5 py-2.5 text-xs font-semibold bg-[var(--zhd-accent)] text-[var(--zhd-accent-fg)] hover:bg-[var(--zhd-accent-hover)] flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        {isPlaying ? (
                          <>
                            <Pause className="w-3.5 h-3.5 fill-current" />
                            <span>Pause</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Play Track</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleFavorite(currentItem.id)}
                        style={{ borderRadius: 'var(--zhd-radius)' }}
                        className="px-3.5 py-2.5 text-xs font-medium bg-white/10 hover:bg-white/20 text-white flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current text-[var(--zhd-accent)]' : ''}`}
                        />
                        <span>{isFavorite ? 'Favorited' : 'Favorite'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={onOpenEqualizer}
                        style={{ borderRadius: 'var(--zhd-radius)' }}
                        className="px-3.5 py-2.5 text-xs font-medium bg-white/10 hover:bg-white/20 text-white flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>Tune EQ</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Video utility controls bar */}
            {currentItem.type === 'video' && (
              <div className="absolute bottom-4 right-4 flex items-center gap-2">
                {isLocalVideo && (
                  <button
                    type="button"
                    onClick={() => setVideoFit((f) => (f === 'cover' ? 'contain' : 'cover'))}
                    className="px-3 py-1.5 text-xs font-medium bg-black/75 text-white hover:bg-black cursor-pointer"
                  >
                    {videoFit === 'cover' ? 'Fit Frame' : 'Fill Frame'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleFullscreen}
                  aria-label="Fullscreen video"
                  className="p-2 bg-black/75 text-white hover:bg-black cursor-pointer"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Clean Unboxed Metadata Strip */}
          <div className="flex flex-wrap items-center justify-between gap-4 py-3 border-y border-[var(--zhd-border)] text-xs text-[var(--zhd-muted)]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[var(--zhd-text)] font-medium">{currentItem.artist}</span>
              <span aria-hidden="true">·</span>
              <span>{currentItem.album}</span>
              <span aria-hidden="true">·</span>
              <span>{currentItem.format}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-num">{currentItem.bitrate}</span>
            </div>
            <div>
              Source: {currentItem.source === 'local' ? 'Local PC Asset' : 'ZHD2 Built-in Collection'}
            </div>
          </div>
        </section>

        {/* Up Next Queue Column (4 cols) */}
        <aside className="lg:col-span-4 flex flex-col gap-4">
          <div className="flex items-baseline justify-between border-b border-[var(--zhd-border)] pb-3">
            <h2 className="font-display text-2xl font-light text-[var(--zhd-text)]">up next</h2>
            <span className="font-mono-num text-xs text-[var(--zhd-muted)]">
              {upNext.length} queued
            </span>
          </div>

          <div className="flex flex-col divide-y divide-[var(--zhd-border)] border border-[var(--zhd-border)] bg-[var(--zhd-surface)]">
            {upNext.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTrack(item)}
                className="p-3 flex items-center gap-3 text-left hover:bg-[var(--zhd-surface-2)] cursor-pointer transition-colors group"
              >
                <div className="w-11 h-11 shrink-0 overflow-hidden bg-[var(--zhd-surface-2)]">
                  <MediaArt
                    src={item.artwork}
                    alt={item.title}
                    type={item.type}
                    className="w-full h-full"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-[var(--zhd-text)] truncate group-hover:text-[var(--zhd-accent)] transition-colors">
                    {item.title}
                  </div>
                  <div className="text-xs text-[var(--zhd-muted)] truncate">
                    {item.artist} · {item.type === 'video' ? 'Video' : item.album}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono-num text-xs text-[var(--zhd-muted)]">
                    {formatDuration(item.duration)}
                  </span>
                  <SkipForward className="w-3.5 h-3.5 text-[var(--zhd-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
