import { useEffect, useRef } from 'react';
import { Power, RotateCcw } from 'lucide-react';
import { audioPipeline } from '../audio/audioPipeline';
import { EQ_FREQ_LABELS, EQ_PRESETS } from '../data/library';
import { ColorScheme } from '../types';

interface EqualizerViewProps {
  enabled: boolean;
  presetId: string;
  bands: number[];
  preampDb: number;
  stereoBalance: number;
  isPlaying: boolean;
  scheme: ColorScheme;
  onToggleEnabled: () => void;
  onSelectPreset: (presetId: string) => void;
  onChangeBand: (index: number, value: number) => void;
  onChangePreamp: (value: number) => void;
  onChangeBalance: (value: number) => void;
  onResetFlat: () => void;
}

export function EqualizerView({
  enabled,
  presetId,
  bands,
  preampDb,
  stereoBalance,
  isPlaying,
  scheme,
  onToggleEnabled,
  onSelectPreset,
  onChangeBand,
  onChangePreamp,
  onChangeBalance,
  onResetFlat,
}: EqualizerViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Live FFT spectrum backdrop behind the EQ response spline
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const data = new Uint8Array(new ArrayBuffer(128));

    const render = (time: number) => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const live = isPlaying && audioPipeline.getFrequencyData(data);
      const cols = 60;
      const cw = w / cols;

      for (let i = 0; i < cols; i++) {
        const val = live
          ? data[Math.min(data.length - 1, Math.floor((i / cols) * 84))] / 255
          : isPlaying
          ? 0.16 + 0.18 * Math.abs(Math.sin(time * 0.003 + i * 0.25))
          : 0.03;
        const bh = val * (h * 0.85);
        ctx.fillStyle = enabled ? `${scheme.accent}35` : 'rgba(128,128,138,0.18)';
        ctx.fillRect(i * cw + 1, h - bh, Math.max(1, cw - 2), bh);
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [enabled, isPlaying, scheme.accent]);

  // Compute SVG polyline points for the 10-band frequency curve
  const svgW = 1000;
  const svgH = 160;
  const points = bands.map((gain, idx) => {
    const x = 40 + (idx / (bands.length - 1)) * (svgW - 80);
    const y = svgH / 2 - (gain / 12) * (svgH / 2 - 18);
    return { x, y };
  });

  const curvePath = points.reduce((acc, pt, idx) => {
    if (idx === 0) return `M ${pt.x} ${pt.y}`;
    const prev = points[idx - 1];
    const cx = (prev.x + pt.x) / 2;
    return `${acc} C ${cx} ${prev.y}, ${cx} ${pt.y}, ${pt.x} ${pt.y}`;
  }, '');

  return (
    <div className="h-full overflow-y-auto px-6 lg:px-10 py-8">
      <div className="max-w-[1380px] mx-auto flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-6 border-b border-[var(--zhd-border)] pb-5">
          <div>
            <p className="text-xs font-medium text-[var(--zhd-muted)] mb-1">
              Web Audio 10-Band Biquad DSP
            </p>
            <h1 className="font-display text-4xl font-light tracking-tight text-[var(--zhd-text)]">
              equalizer
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onResetFlat}
              style={{ borderRadius: 'var(--zhd-radius)' }}
              className="px-4 py-2 text-xs font-medium border border-[var(--zhd-border)] bg-[var(--zhd-surface)] text-[var(--zhd-text)] hover:border-[var(--zhd-accent)] flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Flat</span>
            </button>

            <button
              type="button"
              onClick={onToggleEnabled}
              aria-pressed={enabled}
              style={{ borderRadius: 'var(--zhd-radius)' }}
              className={`px-4 py-2 text-xs font-semibold flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                enabled
                  ? 'bg-[var(--zhd-accent)] text-[var(--zhd-accent-fg)] hover:bg-[var(--zhd-accent-hover)]'
                  : 'bg-[var(--zhd-surface-2)] text-[var(--zhd-muted)] border border-[var(--zhd-border)]'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{enabled ? 'EQ Active' : 'EQ Bypassed'}</span>
            </button>
          </div>
        </div>

        {/* Presets Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {EQ_PRESETS.map((preset) => {
            const active = presetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelectPreset(preset.id)}
                style={{ borderRadius: 'var(--zhd-radius)' }}
                className={`px-3.5 py-2 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors border ${
                  active
                    ? 'bg-[var(--zhd-accent)] text-[var(--zhd-accent-fg)] border-[var(--zhd-accent)]'
                    : 'bg-[var(--zhd-surface)] text-[var(--zhd-text)] border-[var(--zhd-border)] hover:border-[var(--zhd-accent)]'
                }`}
              >
                {preset.name}
              </button>
            );
          })}
          {presetId === 'custom' && (
            <span className="px-3 py-2 text-xs font-medium text-[var(--zhd-accent)]">
              Custom Curve
            </span>
          )}
        </div>

        {/* Live Frequency Response Curve + Real-Time FFT Spectrum */}
        <div
          style={{ borderRadius: 'var(--zhd-radius)' }}
          className="relative h-44 bg-[var(--zhd-surface)] border border-[var(--zhd-border)] overflow-hidden"
        >
          <canvas
            ref={canvasRef}
            width={1000}
            height={176}
            className="absolute inset-0 w-full h-full block"
          />
          <svg
            viewBox={`0 0 ${svgW} ${svgH}`}
            preserveAspectRatio="none"
            className="relative z-10 w-full h-full"
          >
            {/* Reference dB grid lines */}
            <line x1="0" y1={svgH / 2} x2={svgW} y2={svgH / 2} stroke="var(--zhd-border)" strokeDasharray="4 4" />
            <line x1="0" y1={24} x2={svgW} y2={24} stroke="var(--zhd-border)" strokeOpacity="0.45" />
            <line x1="0" y1={svgH - 24} x2={svgW} y2={svgH - 24} stroke="var(--zhd-border)" strokeOpacity="0.45" />

            {/* Smooth EQ spline */}
            <path
              d={curvePath}
              fill="none"
              stroke={enabled ? scheme.accent : 'var(--zhd-muted)'}
              strokeWidth="3"
            />
            {points.map((pt, idx) => (
              <circle
                key={idx}
                cx={pt.x}
                cy={pt.y}
                r="5"
                fill={enabled ? scheme.accent : 'var(--zhd-muted)'}
              />
            ))}
          </svg>
          <div className="absolute top-2.5 left-3 font-mono-num text-[11px] text-[var(--zhd-muted)]">
            +12 dB
          </div>
          <div className="absolute bottom-2.5 left-3 font-mono-num text-[11px] text-[var(--zhd-muted)]">
            -12 dB
          </div>
        </div>

        {/* 10-Band Vertical Sliders + Preamp / Balance */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div
            style={{ borderRadius: 'var(--zhd-radius)' }}
            className="lg:col-span-9 p-6 bg-[var(--zhd-surface)] border border-[var(--zhd-border)] overflow-x-auto"
          >
            <div className="grid grid-cols-10 gap-2 min-w-[560px]">
              {bands.map((gain, idx) => (
                <div key={EQ_FREQ_LABELS[idx]} className="flex flex-col items-center gap-3">
                  <span className="font-mono-num text-xs font-medium text-[var(--zhd-text)]">
                    {gain > 0 ? `+${gain.toFixed(1)}` : gain.toFixed(1)}
                  </span>
                  <input
                    type="range"
                    min={-12}
                    max={12}
                    step={0.5}
                    value={gain}
                    disabled={!enabled}
                    onChange={(e) => onChangeBand(idx, Number(e.target.value))}
                    aria-label={`${EQ_FREQ_LABELS[idx]} gain`}
                    className="zhd-eq-vertical disabled:opacity-40"
                  />
                  <span className="font-mono-num text-[11px] text-[var(--zhd-muted)] whitespace-nowrap">
                    {EQ_FREQ_LABELS[idx]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{ borderRadius: 'var(--zhd-radius)' }}
            className="lg:col-span-3 p-6 bg-[var(--zhd-surface)] border border-[var(--zhd-border)] flex flex-col justify-between gap-6"
          >
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-medium text-[var(--zhd-text)]">Preamp Gain</span>
                <span className="font-mono-num text-[var(--zhd-muted)]">
                  {preampDb > 0 ? `+${preampDb.toFixed(1)}` : preampDb.toFixed(1)} dB
                </span>
              </div>
              <input
                type="range"
                min={-12}
                max={12}
                step={0.5}
                value={preampDb}
                disabled={!enabled}
                onChange={(e) => onChangePreamp(Number(e.target.value))}
                aria-label="Preamp gain"
                className="zhd-slider w-full h-5 disabled:opacity-40"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-medium text-[var(--zhd-text)]">Stereo Balance</span>
                <span className="font-mono-num text-[var(--zhd-muted)]">
                  {stereoBalance === 0
                    ? 'Center'
                    : stereoBalance < 0
                    ? `L ${Math.round(Math.abs(stereoBalance) * 100)}%`
                    : `R ${Math.round(stereoBalance * 100)}%`}
                </span>
              </div>
              <input
                type="range"
                min={-1}
                max={1}
                step={0.05}
                value={stereoBalance}
                onChange={(e) => onChangeBalance(Number(e.target.value))}
                aria-label="Stereo balance"
                className="zhd-slider w-full h-5"
              />
            </div>

            <p className="text-xs text-[var(--zhd-muted)] leading-relaxed border-t border-[var(--zhd-border)] pt-4">
              Audio filters process both built-in tracks and imported local audio/video files in real time through the Web Audio Biquad graph.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
