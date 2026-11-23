import { useEffect, useRef, useState } from 'react';
import { Pause, Play, SkipBack, SkipForward, X } from 'lucide-react';
import { audioPipeline } from '../audio/audioPipeline';
import { ColorScheme, MediaItem, ScreensaverMode } from '../types';
import { formatDuration } from '../utils/format';
import { MediaArt } from './MediaArt';

interface ScreensaverOverlayProps {
  mode: ScreensaverMode;
  currentItem: MediaItem;
  mediaItems: MediaItem[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  scheme: ColorScheme;
  onExit: () => void;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export function ScreensaverOverlay({
  mode,
  currentItem,
  mediaItems,
  isPlaying,
  currentTime,
  duration,
  scheme,
  onExit,
  onTogglePlay,
  onPrev,
  onNext,
}: ScreensaverOverlayProps) {
  const [clock, setClock] = useState(() => new Date());
  const [showHud, setShowHud] = useState(true);
  const [oledOffset, setOledOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hudTimerRef = useRef<number | null>(null);

  // Live clock for OLED & Mosaic modes
  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Gentle burn-in-safe drift for OLED clock mode
  useEffect(() => {
    if (mode !== 'oled-clock') return;
    const id = window.setInterval(() => {
      setOledOffset({
        x: Math.round((Math.random() - 0.5) * 140),
        y: Math.round((Math.random() - 0.5) * 80),
      });
    }, 6500);
    return () => window.clearInterval(id);
  }, [mode]);

  // Escape exits screensaver
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onExit]);

  // Auto-hide bottom HUD after 3.5 seconds of no pointer movement
  const bumpHud = () => {
    setShowHud(true);
    if (hudTimerRef.current) window.clearTimeout(hudTimerRef.current);
    hudTimerRef.current = window.setTimeout(() => setShowHud(false), 3500);
  };

  useEffect(() => {
    bumpHud();
    return () => {
      if (hudTimerRef.current) window.clearTimeout(hudTimerRef.current);
    };
  }, []);

  // Harmonic Spectrum Ribbon Canvas Renderer
  useEffect(() => {
    if (mode !== 'spectrum-ribbon') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let rafId = 0;
    const freq = new Uint8Array(new ArrayBuffer(128));

    const draw = (time: number) => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = 'rgba(7, 7, 10, 0.24)';
      ctx.fillRect(0, 0, w, h);

      const hasLive = isPlaying && audioPipeline.getFrequencyData(freq);
      const t = time * 0.0012;

      // 3 layered harmonic ribbons
      for (let layer = 0; layer < 3; layer++) {
        ctx.beginPath();
        const baseY = h * (0.44 + layer * 0.08);
        const amp = 45 + layer * 28;
        for (let x = 0; x <= w; x += 14) {
          const norm = x / w;
          const bin = Math.min(freq.length - 1, Math.floor(norm * 80));
          const energy = hasLive
            ? freq[bin] / 255
            : isPlaying
            ? 0.28 + 0.2 * Math.sin(t * 2 + norm * 8)
            : 0.08;
          const y =
            baseY +
            Math.sin(norm * 6 + t * (1.1 + layer * 0.35) + layer * 1.4) * (amp * (0.35 + energy));
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.lineWidth = layer === 0 ? 3 : 1.5;
        ctx.strokeStyle =
          layer === 0
            ? scheme.accent
            : layer === 1
            ? 'rgba(255,255,255,0.65)'
            : `${scheme.accent}77`;
        ctx.stroke();
      }

      // Crisp bottom FFT pillars
      const bars = 64;
      const bw = w / bars;
      for (let i = 0; i < bars; i++) {
        const val = hasLive
          ? freq[Math.floor((i / bars) * 96)] / 255
          : isPlaying
          ? 0.14 + 0.16 * Math.abs(Math.sin(t * 3 + i * 0.3))
          : 0.04;
        const bh = val * (h * 0.28);
        ctx.fillStyle = i % 6 === 0 ? scheme.accent : 'rgba(255,255,255,0.16)';
        ctx.fillRect(i * bw + 2, h - bh, Math.max(2, bw - 4), bh);
      }

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [mode, isPlaying, scheme.accent]);

  const mosaicArtworks = Array.from({ length: 18 }, (_, idx) => {
    const item = mediaItems[idx % mediaItems.length];
    return { key: `${item.id}-${idx}`, item };
  });

  const timeString = clock.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const dateString = clock.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const safeDuration = duration > 0 ? duration : currentItem.duration;
  const pct = Math.min(100, Math.max(0, (currentTime / safeDuration) * 100));

  return (
    <div
      role="dialog"
      aria-label="ZHD2 Now Playing Screensaver"
      onMouseMove={bumpHud}
      className="fixed inset-0 z-50 bg-[#070709] text-white overflow-hidden select-none"
    >
      {/* Mode 1: Zune Album Mosaic */}
      {mode === 'album-mosaic' && (
        <div className="absolute inset-0">
          <div className="grid grid-cols-3 sm:grid-cols-6 grid-rows-3 w-full h-full gap-1 opacity-45">
            {mosaicArtworks.map(({ key, item }, idx) => (
              <div
                key={key}
                className="relative overflow-hidden bg-neutral-900"
                style={{
                  transform:
                    item.id === currentItem.id
                      ? 'scale(1.04)'
                      : idx % 3 === 0
                      ? 'scale(1.01)'
                      : 'scale(1)',
                  transition: 'transform 1.2s ease',
                }}
              >
                <MediaArt src={item.artwork} alt={item.album} className="w-full h-full" />
                {item.id === currentItem.id && (
                  <div
                    className="absolute inset-0 border-2"
                    style={{ borderColor: scheme.accent }}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/55" />

          <div className="absolute inset-0 flex flex-col justify-between p-10 sm:p-16">
            <div className="flex items-start justify-between">
              <div className="font-display text-5xl sm:text-7xl font-light tracking-tight font-mono-num">
                {timeString}
              </div>
              <div className="text-right text-sm text-white/75">{dateString}</div>
            </div>

            <div className="flex items-end gap-8 max-w-3xl">
              <div className="w-28 h-28 sm:w-36 sm:h-36 shrink-0 border border-white/20 overflow-hidden shadow-2xl">
                <MediaArt src={currentItem.artwork} alt={currentItem.title} className="w-full h-full" />
              </div>
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-widest text-white/70 mb-2">
                  Now Playing · ZHD2 Mosaic
                </div>
                <h2 className="font-display text-4xl sm:text-6xl font-semibold tracking-tight leading-none truncate">
                  {currentItem.title}
                </h2>
                <p className="text-lg sm:text-2xl font-light text-white/80 mt-2 truncate">
                  {currentItem.artist} · {currentItem.album}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: Metro Kinetic Typography (Iconic Zune HD / WP7 moving artist names) */}
      {mode === 'kinetic-type' && (
        <div
          className="absolute inset-0 flex flex-col justify-between p-10 sm:p-16"
          style={{
            background: `radial-gradient(circle at 20% 20%, ${scheme.accent}45 0%, #09090d 55%, #050507 100%)`,
          }}
        >
          <div className="space-y-2 overflow-hidden">
            <div className="font-display text-6xl sm:text-8xl font-light tracking-tight text-white/95 leading-none">
              {currentItem.artist}
            </div>
            <div className="font-display text-4xl sm:text-6xl font-semibold tracking-tight leading-none" style={{ color: scheme.accent }}>
              {currentItem.title}
            </div>
            <div className="font-display text-2xl sm:text-4xl font-light text-white/65">
              {currentItem.album} · {currentItem.year}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
            <div className="md:col-span-5 flex items-center gap-6">
              <div className="w-28 h-28 shrink-0 overflow-hidden border border-white/15">
                <MediaArt src={currentItem.artwork} alt={currentItem.title} className="w-full h-full" />
              </div>
              <div className="text-sm text-white/75 space-y-1">
                <div>{currentItem.genre}</div>
                <div className="font-mono-num">
                  {currentItem.format} · {currentItem.bitrate}
                </div>
                <div className="font-mono-num">
                  {formatDuration(currentTime)} / {formatDuration(safeDuration)}
                </div>
              </div>
            </div>

            <div className="md:col-span-7 text-left md:text-right">
              <div className="font-display text-5xl sm:text-7xl font-light font-mono-num">
                {timeString}
              </div>
              <div className="text-sm text-white/70 mt-1">{dateString}</div>
            </div>
          </div>
        </div>
      )}

      {/* Mode 3: Harmonic Spectrum Ribbon */}
      {mode === 'spectrum-ribbon' && (
        <div className="absolute inset-0">
          <canvas ref={canvasRef} className="w-full h-full block" />
          <div className="absolute top-10 left-10 right-10 flex items-start justify-between pointer-events-none">
            <div>
              <div className="text-xs text-white/65 mb-1">Harmonic Spectrum</div>
              <div className="font-display text-3xl sm:text-5xl font-light tracking-tight">
                {currentItem.title}
              </div>
              <div className="text-base text-white/75 mt-1">
                {currentItem.artist} · {currentItem.album}
              </div>
            </div>
            <div className="font-display text-4xl font-light font-mono-num text-white/85">
              {timeString}
            </div>
          </div>
        </div>
      )}

      {/* Mode 4: OLED Minimal Clock */}
      {mode === 'oled-clock' && (
        <div className="absolute inset-0 bg-black flex items-center justify-center p-10">
          <div
            className="flex flex-col sm:flex-row items-center gap-10 transition-transform duration-1000"
            style={{ transform: `translate(${oledOffset.x}px, ${oledOffset.y}px)` }}
          >
            <div className="w-40 h-40 shrink-0 overflow-hidden border border-white/15">
              <MediaArt src={currentItem.artwork} alt={currentItem.title} className="w-full h-full" />
            </div>
            <div className="text-center sm:text-left">
              <div className="font-display text-6xl sm:text-8xl font-light font-mono-num leading-none">
                {timeString}
              </div>
              <div className="text-sm text-white/60 mt-2">{dateString}</div>
              <div className="mt-6">
                <div className="font-display text-2xl font-semibold text-white">
                  {currentItem.title}
                </div>
                <div className="text-sm text-white/70 mt-0.5">
                  {currentItem.artist} · {currentItem.album}
                </div>
              </div>
              <div className="mt-4 w-64 h-1 bg-white/15 overflow-hidden mx-auto sm:mx-0">
                <div
                  className="h-full"
                  style={{ width: `${pct}%`, backgroundColor: scheme.accent }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subtle Hover HUD for Transport & Exit */}
      <div
        className={`absolute bottom-0 left-0 right-0 px-8 py-5 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-between gap-4 transition-opacity duration-300 ${
          showHud ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onPrev}
            aria-label="Previous"
            className="w-10 h-10 bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer transition-colors"
          >
            <SkipBack className="w-4 h-4 fill-current" />
          </button>
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            style={{ backgroundColor: scheme.accent, color: scheme.accentFg }}
            className="w-11 h-11 flex items-center justify-center cursor-pointer hover:brightness-110 transition-all"
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
            aria-label="Next"
            className="w-10 h-10 bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer transition-colors"
          >
            <SkipForward className="w-4 h-4 fill-current" />
          </button>
          <span className="font-mono-num text-xs text-white/75 ml-2">
            {formatDuration(currentTime)} / {formatDuration(safeDuration)}
          </span>
        </div>

        <button
          type="button"
          onClick={onExit}
          className="px-4 py-2 text-xs font-semibold bg-white/15 hover:bg-white/25 text-white flex items-center gap-2 cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" />
          <span>Exit Screensaver (Esc)</span>
        </button>
      </div>
    </div>
  );
}
