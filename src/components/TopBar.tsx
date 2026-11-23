import { NavSection } from '../types';

interface TopBarProps {
  activeSection: NavSection;
  onNavigate: (section: NavSection) => void;
}

const NAV_ITEMS: Array<{ id: NavSection; label: string }> = [
  { id: 'quickplay', label: 'Quickplay' },
  { id: 'library', label: 'Library' },
  { id: 'now-playing', label: 'Now Playing' },
  { id: 'equalizer', label: 'Equalizer' },
  { id: 'customize', label: 'Customize' },
];

export function TopBar({ activeSection, onNavigate }: TopBarProps) {
  return (
    <header className="h-14 shrink-0 flex items-center justify-between gap-8 px-6 border-b border-[var(--zhd-border)] bg-[var(--zhd-surface)]">
      {/* Zone 1: Single-line Brand Wordmark */}
      <button
        type="button"
        onClick={() => onNavigate('quickplay')}
        className="font-display text-xl font-semibold tracking-tight text-[var(--zhd-text)] whitespace-nowrap shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
      >
        ZHD2
      </button>

      {/* Zone 2: 5 Single-Line Navigation Links */}
      <nav aria-label="Primary" className="flex items-center gap-6 overflow-x-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`relative py-4 text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                isActive
                  ? 'text-[var(--zhd-text)]'
                  : 'text-[var(--zhd-muted)] hover:text-[var(--zhd-text)]'
              }`}
            >
              {item.label}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 right-0 bottom-0 h-0.5 bg-[var(--zhd-accent)]"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: 1 Primary Action */}
      <div className="shrink-0">
        <button
          type="button"
          onClick={() => onNavigate('windows-setup')}
          style={{ borderRadius: 'var(--zhd-radius)' }}
          className={`px-4 py-2 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
            activeSection === 'windows-setup'
              ? 'bg-[var(--zhd-text)] text-[var(--zhd-bg)]'
              : 'bg-[var(--zhd-accent)] text-[var(--zhd-accent-fg)] hover:bg-[var(--zhd-accent-hover)]'
          }`}
        >
          Windows Setup
        </button>
      </div>
    </header>
  );
}
