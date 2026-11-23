import { Check, MonitorPlay, Moon, Sun } from 'lucide-react';
import { COLOR_SCHEMES } from '../data/themes';
import { CornerStyle, ScreensaverMode, SurfaceMode, ZhdConfig } from '../types';

interface CustomizeViewProps {
  config: ZhdConfig;
  onUpdateConfig: (patch: Partial<ZhdConfig>) => void;
  onLaunchScreensaver: () => void;
}

const SCREENSAVER_MODES: Array<{
  id: ScreensaverMode;
  name: string;
  desc: string;
}> = [
  {
    id: 'album-mosaic',
    name: 'Zune Album Mosaic',
    desc: 'Classic Zune wall of album artwork tiles with live clock and floating track card.',
  },
  {
    id: 'kinetic-type',
    name: 'Metro Kinetic Typography',
    desc: 'Large Zune HD artist and album typography over an accent-tinted twilight canvas.',
  },
  {
    id: 'spectrum-ribbon',
    name: 'Harmonic Spectrum Ribbon',
    desc: 'Audio-reactive harmonic waves and frequency pillars driven live by the equalizer.',
  },
  {
    id: 'oled-clock',
    name: 'OLED Minimal Clock',
    desc: 'Deep black burn-in-safe drifting album frame and large tabular clock.',
  },
];

const TIMEOUT_OPTIONS = [
  { value: 10, label: '10 seconds' },
  { value: 20, label: '20 seconds' },
  { value: 30, label: '30 seconds' },
  { value: 60, label: '1 minute' },
  { value: 120, label: '2 minutes' },
  { value: 0, label: 'Manual only' },
];

export function CustomizeView({
  config,
  onUpdateConfig,
  onLaunchScreensaver,
}: CustomizeViewProps) {
  return (
    <div className="h-full overflow-y-auto px-6 lg:px-10 py-8">
      <div className="max-w-[1380px] mx-auto flex flex-col gap-10">
        {/* Header */}
        <div className="border-b border-[var(--zhd-border)] pb-5">
          <p className="text-xs font-medium text-[var(--zhd-muted)] mb-1">
            Personalization · Zune 30GB, Zune HD & Metro
          </p>
          <h1 className="font-display text-4xl font-light tracking-tight text-[var(--zhd-text)]">
            customize
          </h1>
        </div>

        {/* Section 1: Accent Color Schemes */}
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="font-display text-2xl font-light text-[var(--zhd-text)]">
              color scheme
            </h2>
            <p className="text-sm text-[var(--zhd-muted)] mt-0.5">
              Select a Zune or Windows 8 Metro accent palette applied across live tiles, controls, and visualizers.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {COLOR_SCHEMES.map((scheme) => {
              const selected = config.colorSchemeId === scheme.id;
              return (
                <button
                  key={scheme.id}
                  type="button"
                  onClick={() => onUpdateConfig({ colorSchemeId: scheme.id })}
                  style={{ borderRadius: 'var(--zhd-radius)' }}
                  className={`p-4 text-left border transition-colors cursor-pointer bg-[var(--zhd-surface)] ${
                    selected
                      ? 'border-[var(--zhd-accent)]'
                      : 'border-[var(--zhd-border)] hover:border-[var(--zhd-muted)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-7 h-7 block"
                        style={{ backgroundColor: scheme.accent }}
                      />
                      <span
                        className="w-7 h-7 block"
                        style={{ backgroundColor: scheme.secondaryTile }}
                      />
                    </div>
                    {selected && <Check className="w-4 h-4 text-[var(--zhd-accent)]" />}
                  </div>
                  <div className="font-display text-base font-semibold text-[var(--zhd-text)]">
                    {scheme.name}
                  </div>
                  <div className="text-xs text-[var(--zhd-muted)] mt-0.5">{scheme.origin}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Section 2: Surface Mode & Geometry */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-[var(--zhd-border)] pt-8">
          <div className="flex flex-col gap-3">
            <h2 className="font-display text-2xl font-light text-[var(--zhd-text)]">
              surface theme
            </h2>
            <p className="text-sm text-[var(--zhd-muted)]">
              Switch between deep Zune HD OLED dark and crisp Zune Software desktop light.
            </p>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {(
                [
                  { id: 'dark', label: 'Metro Dark', icon: Moon },
                  { id: 'light', label: 'Zune Light', icon: Sun },
                ] as Array<{ id: SurfaceMode; label: string; icon: typeof Moon }>
              ).map((opt) => {
                const Icon = opt.icon;
                const active = config.surfaceMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onUpdateConfig({ surfaceMode: opt.id })}
                    style={{ borderRadius: 'var(--zhd-radius)' }}
                    className={`p-4 border flex items-center gap-3 text-sm font-medium cursor-pointer transition-colors ${
                      active
                        ? 'bg-[var(--zhd-accent)] text-[var(--zhd-accent-fg)] border-[var(--zhd-accent)]'
                        : 'bg-[var(--zhd-surface)] text-[var(--zhd-text)] border-[var(--zhd-border)] hover:border-[var(--zhd-accent)]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="font-display text-2xl font-light text-[var(--zhd-text)]">
              tile geometry
            </h2>
            <p className="text-sm text-[var(--zhd-muted)]">
              Choose sharp architectural Windows 8 Metro corners or slightly softened Zune software controls.
            </p>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {(
                [
                  { id: 'sharp', label: 'Sharp Metro (0px)' },
                  { id: 'soft', label: 'Soft Zune (4px)' },
                ] as Array<{ id: CornerStyle; label: string }>
              ).map((opt) => {
                const active = config.cornerStyle === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onUpdateConfig({ cornerStyle: opt.id })}
                    style={{ borderRadius: opt.id === 'sharp' ? '0px' : '4px' }}
                    className={`p-4 border text-left text-sm font-medium cursor-pointer transition-colors ${
                      active
                        ? 'bg-[var(--zhd-accent)] text-[var(--zhd-accent-fg)] border-[var(--zhd-accent)]'
                        : 'bg-[var(--zhd-surface)] text-[var(--zhd-text)] border-[var(--zhd-border)] hover:border-[var(--zhd-accent)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Section 3: Now Playing Screensavers */}
        <section className="flex flex-col gap-5 border-t border-[var(--zhd-border)] pt-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-light text-[var(--zhd-text)]">
                now playing screensavers
              </h2>
              <p className="text-sm text-[var(--zhd-muted)] mt-0.5">
                Automatically plays when you leave the Now Playing screen idle.
              </p>
            </div>

            <button
              type="button"
              onClick={onLaunchScreensaver}
              style={{ borderRadius: 'var(--zhd-radius)' }}
              className="px-4 py-2 text-xs font-semibold bg-[var(--zhd-accent)] text-[var(--zhd-accent-fg)] hover:bg-[var(--zhd-accent-hover)] flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              <MonitorPlay className="w-4 h-4" />
              <span>Preview Active Screensaver</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {SCREENSAVER_MODES.map((item) => {
              const selected = config.screensaverMode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onUpdateConfig({ screensaverMode: item.id })}
                  style={{ borderRadius: 'var(--zhd-radius)' }}
                  className={`p-5 text-left border transition-colors cursor-pointer bg-[var(--zhd-surface)] flex flex-col justify-between gap-3 ${
                    selected
                      ? 'border-[var(--zhd-accent)]'
                      : 'border-[var(--zhd-border)] hover:border-[var(--zhd-muted)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-base font-semibold text-[var(--zhd-text)]">
                      {item.name}
                    </span>
                    {selected && <Check className="w-4 h-4 text-[var(--zhd-accent)] shrink-0" />}
                  </div>
                  <p className="text-xs text-[var(--zhd-muted)] leading-relaxed">{item.desc}</p>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <span className="text-xs font-medium text-[var(--zhd-text)] mr-2">
              Idle activation timeout:
            </span>
            {TIMEOUT_OPTIONS.map((opt) => {
              const active = config.screensaverTimeoutSec === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onUpdateConfig({ screensaverTimeoutSec: opt.value })}
                  style={{ borderRadius: 'var(--zhd-radius)' }}
                  className={`px-3 py-1.5 text-xs font-medium border whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    active
                      ? 'bg-[var(--zhd-accent)] text-[var(--zhd-accent-fg)] border-[var(--zhd-accent)]'
                      : 'bg-[var(--zhd-surface)] text-[var(--zhd-text)] border-[var(--zhd-border)] hover:border-[var(--zhd-accent)]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
