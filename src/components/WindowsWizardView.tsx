import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  FileCode2,
  FolderOpen,
  FolderPlus,
  HardDrive,
  Play,
  Settings2,
} from 'lucide-react';
import { ALL_FILE_ASSOCIATIONS, EQ_PRESETS } from '../data/library';
import { COLOR_SCHEMES } from '../data/themes';
import { MediaItem, ScreensaverMode, WindowsInstallConfig, ZhdConfig } from '../types';
import { downloadTextFile } from '../utils/format';

interface WindowsWizardViewProps {
  config: ZhdConfig;
  mediaItems: MediaItem[];
  onUpdateConfig: (patch: Partial<ZhdConfig>) => void;
  onImportFiles: (files: FileList | null) => Promise<number>;
  onFinishAndLaunch: () => void;
}

const STEPS = [
  { id: 0, title: 'Welcome & Edition' },
  { id: 1, title: 'Paths & Local Assets' },
  { id: 2, title: 'Windows Associations' },
  { id: 3, title: 'User Configuration' },
  { id: 4, title: 'Install & Write' },
  { id: 5, title: 'EXE Build Kit' },
];

export function WindowsWizardView({
  config,
  mediaItems,
  onUpdateConfig,
  onImportFiles,
  onFinishAndLaunch,
}: WindowsWizardViewProps) {
  const [step, setStep] = useState(0);
  const [installing, setInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState(0);
  const [installLog, setInstallLog] = useState<string[]>([]);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);

  const win = config.windowsInstall;
  const localAssetsCount = mediaItems.filter((m) => m.source === 'local').length;
  const isNativeElectron = Boolean(window.zhd2Desktop?.isDesktop);

  const updateWin = (patch: Partial<WindowsInstallConfig>) => {
    onUpdateConfig({
      windowsInstall: {
        ...win,
        ...patch,
      },
    });
  };

  const toggleAssociation = (ext: string) => {
    const exists = win.fileAssociations.includes(ext);
    const next = exists
      ? win.fileAssociations.filter((e) => e !== ext)
      : [...win.fileAssociations, ext];
    updateWin({ fileAssociations: next });
  };

  const handleNativeFolderBrowse = async (
    field: 'installDir' | 'musicDir' | 'videoDir' | 'assetsCacheDir' | 'configDir',
    label: string
  ) => {
    if (window.zhd2Desktop?.selectFolder) {
      const picked = await window.zhd2Desktop.selectFolder(label);
      if (picked) {
        updateWin({ [field]: picked });
      }
    }
  };

  const handleWizardFileImport = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const count = await onImportFiles(files);
    setImportFeedback(`Indexed ${count} local media ${count === 1 ? 'file' : 'files'} into ZHD2 local asset store.`);
  };

  const runInstallation = () => {
    setInstalling(true);
    setInstallProgress(0);
    setInstallLog([]);

    const tasks = [
      `Validating target directory: ${win.installDir}`,
      `Initializing local assets cache at ${win.assetsCacheDir}`,
      `Indexing music & video library paths (${win.musicDir}, ${win.videoDir})`,
      `Registering Windows file associations (${win.fileAssociations.join(', ') || 'none'})`,
      `Writing user configuration (${win.configDir}\\config.json)`,
      `Applying ${config.colorSchemeId} theme, EQ preset (${config.eqPresetId}), and ${config.screensaverMode} screensaver`,
      `Finalizing ${win.edition === 'installer-exe' ? 'ZHD2-Setup.exe' : 'ZHD2-Portable.exe'} manifest (${win.architecture})`,
    ];

    let idx = 0;
    const timer = window.setInterval(() => {
      if (idx < tasks.length) {
        setInstallLog((prev) => [...prev, tasks[idx]]);
        setInstallProgress(Math.round(((idx + 1) / tasks.length) * 100));
        idx += 1;
      } else {
        window.clearInterval(timer);
        setInstalling(false);
        updateWin({
          installed: true,
          installedAt: new Date().toISOString(),
        });
        setStep(5);
      }
    }, 280);
  };

  const handleDownloadConfigJson = () => {
    const payload = JSON.stringify(
      {
        app: 'ZHD2 Media Player',
        version: '2.0.0',
        generatedAt: new Date().toISOString(),
        ...config,
      },
      null,
      2
    );
    downloadTextFile('zhd2-config.json', payload, 'application/json;charset=utf-8');
  };

  const handleDownloadNsisScript = () => {
    const assocLines = win.fileAssociations
      .map(
        (ext) =>
          `  WriteRegStr HKCU "Software\\Classes\\${ext}\\OpenWithProgids" "ZHD2.MediaFile" ""`
      )
      .join('\n');

    const nsh = `; ZHD2 Media Player — Generated Windows NSIS Installer Script
; Edition: ${win.edition} (${win.architecture})
; Target Install Dir: ${win.installDir}

!macro customInstall
  CreateDirectory "${win.assetsCacheDir}"
  CreateDirectory "${win.configDir}"

  FileOpen $0 "${win.configDir}\\config.json" w
  FileWrite $0 '${JSON.stringify({
    colorSchemeId: config.colorSchemeId,
    surfaceMode: config.surfaceMode,
    cornerStyle: config.cornerStyle,
    screensaverMode: config.screensaverMode,
    screensaverTimeoutSec: config.screensaverTimeoutSec,
    eqEnabled: config.eqEnabled,
    eqPresetId: config.eqPresetId,
    eqBands: config.eqBands,
    musicDir: win.musicDir,
    videoDir: win.videoDir,
  })}'
  FileClose $0

  WriteRegStr HKCU "Software\\Classes\\ZHD2.MediaFile" "" "ZHD2 Media File"
  WriteRegStr HKCU "Software\\Classes\\ZHD2.MediaFile\\shell\\open\\command" "" '"$INSTDIR\\ZHD2 Media Player.exe" "%1"'
${assocLines}
!macroend
`;
    downloadTextFile('installer.nsh', nsh);
  };

  const handleDownloadBuildScript = () => {
    const targetFlag =
      win.edition === 'portable-exe' ? '--win portable' : '--win nsis';
    const archFlag = win.architecture === 'arm64' ? '--arm64' : '--x64';
    const ps1 = `# ZHD2 Media Player — Custom Windows EXE Build Script
# Target: ${win.edition} (${win.architecture})
$ErrorActionPreference = "Stop"

Write-Host "Building ZHD2 Media Player Windows EXE (${win.architecture})..." -ForegroundColor Magenta
npm install
npm install -D electron electron-builder
npm run build
npx electron-builder ${targetFlag} ${archFlag} --config electron-builder.yml
Write-Host "Build complete. Check the .\\release folder for your ZHD2 .exe file." -ForegroundColor Green
`;
    downloadTextFile('build-zhd2-exe.ps1', ps1);
  };

  return (
    <div className="h-full overflow-y-auto px-6 lg:px-10 py-8">
      <div className="max-w-[1260px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Metro Wizard Step Rail */}
        <aside className="lg:col-span-3 flex flex-col gap-5">
          <div>
            <p className="text-xs font-medium text-[var(--zhd-muted)] mb-1">
              Windows 10 / 11 Desktop Package
            </p>
            <h1 className="font-display text-3xl font-light tracking-tight text-[var(--zhd-text)]">
              windows setup
            </h1>
          </div>

          <ol className="flex flex-col border-t border-[var(--zhd-border)]">
            {STEPS.map((s) => {
              const isCurrent = step === s.id;
              const isDone = step > s.id || (win.installed && s.id < 5);
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    disabled={installing}
                    onClick={() => setStep(s.id)}
                    className={`w-full py-3.5 px-2 flex items-center justify-between gap-3 border-b border-[var(--zhd-border)] text-left text-sm cursor-pointer transition-colors disabled:opacity-50 ${
                      isCurrent
                        ? 'text-[var(--zhd-accent)] font-semibold'
                        : 'text-[var(--zhd-muted)] hover:text-[var(--zhd-text)]'
                    }`}
                  >
                    <span className="truncate">
                      0{s.id + 1}. {s.title}
                    </span>
                    {isDone && <Check className="w-4 h-4 text-[var(--zhd-accent)] shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="text-xs text-[var(--zhd-muted)] space-y-1.5">
            <div>
              Runtime: <span className="text-[var(--zhd-text)]">{isNativeElectron ? 'Windows Desktop EXE' : 'Web Preview + EXE Exporter'}</span>
            </div>
            <div>
              Local Assets Indexed: <span className="font-mono-num text-[var(--zhd-text)]">{localAssetsCount}</span>
            </div>
          </div>
        </aside>

        {/* Right Active Wizard Panel */}
        <section
          style={{ borderRadius: 'var(--zhd-radius)' }}
          className="lg:col-span-9 bg-[var(--zhd-surface)] border border-[var(--zhd-border)] p-6 sm:p-8 flex flex-col justify-between min-h-[540px] gap-8"
        >
          {/* Step 0: Welcome & Edition */}
          {step === 0 && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-light text-[var(--zhd-text)]">
                  ZHD2 Windows Installation Wizard
                </h2>
                <p className="text-sm text-[var(--zhd-muted)] mt-2 max-w-2xl leading-relaxed">
                  Configure your Windows local asset directories, media file associations, and default user preferences. When complete, ZHD2 saves your configuration locally and generates ready-to-build Windows EXE installer scripts.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => updateWin({ edition: 'installer-exe' })}
                  style={{ borderRadius: 'var(--zhd-radius)' }}
                  className={`p-5 text-left border cursor-pointer transition-colors ${
                    win.edition === 'installer-exe'
                      ? 'border-[var(--zhd-accent)] bg-[var(--zhd-surface-2)]'
                      : 'border-[var(--zhd-border)] hover:border-[var(--zhd-muted)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-display text-lg font-semibold text-[var(--zhd-text)]">
                      Windows Installer (.exe)
                    </span>
                    {win.edition === 'installer-exe' && (
                      <Check className="w-4 h-4 text-[var(--zhd-accent)]" />
                    )}
                  </div>
                  <p className="text-xs text-[var(--zhd-muted)] leading-relaxed">
                    Full NSIS wizard installing to Program Files, creating Start Menu & Desktop shortcuts, AppData config, and Explorer file associations.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => updateWin({ edition: 'portable-exe' })}
                  style={{ borderRadius: 'var(--zhd-radius)' }}
                  className={`p-5 text-left border cursor-pointer transition-colors ${
                    win.edition === 'portable-exe'
                      ? 'border-[var(--zhd-accent)] bg-[var(--zhd-surface-2)]'
                      : 'border-[var(--zhd-border)] hover:border-[var(--zhd-muted)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-display text-lg font-semibold text-[var(--zhd-text)]">
                      Portable Standalone (.exe)
                    </span>
                    {win.edition === 'portable-exe' && (
                      <Check className="w-4 h-4 text-[var(--zhd-accent)]" />
                    )}
                  </div>
                  <p className="text-xs text-[var(--zhd-muted)] leading-relaxed">
                    Single zero-install executable storing local assets and zhd2-config.json beside the EXE for USB drives or secondary PCs.
                  </p>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-[var(--zhd-border)]">
                <span className="text-xs font-medium text-[var(--zhd-text)]">Target Architecture:</span>
                {(['x64', 'arm64'] as const).map((arch) => (
                  <button
                    key={arch}
                    type="button"
                    onClick={() => updateWin({ architecture: arch })}
                    style={{ borderRadius: 'var(--zhd-radius)' }}
                    className={`px-3.5 py-1.5 text-xs font-mono-num border cursor-pointer transition-colors ${
                      win.architecture === arch
                        ? 'bg-[var(--zhd-accent)] text-[var(--zhd-accent-fg)] border-[var(--zhd-accent)]'
                        : 'border-[var(--zhd-border)] text-[var(--zhd-text)] hover:border-[var(--zhd-accent)]'
                    }`}
                  >
                    Windows {arch}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Paths & Local Assets */}
          {step === 1 && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-light text-[var(--zhd-text)]">
                  Install Directories & Local Assets
                </h2>
                <p className="text-sm text-[var(--zhd-muted)] mt-1">
                  Specify Windows installation and media folders, and import local music or video assets directly into ZHD2.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {(
                  [
                    { field: 'installDir', label: 'Application Install Path' },
                    { field: 'musicDir', label: 'Local Music Library Folder' },
                    { field: 'videoDir', label: 'Local Video Library Folder' },
                    { field: 'assetsCacheDir', label: 'Local Artwork & Asset Cache' },
                    { field: 'configDir', label: 'User Configuration Directory' },
                  ] as const
                ).map(({ field, label }) => (
                  <div key={field} className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-[var(--zhd-muted)]">{label}</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={win[field]}
                        onChange={(e) => updateWin({ [field]: e.target.value })}
                        style={{ borderRadius: 'var(--zhd-radius)' }}
                        className="flex-1 px-3 py-2 font-mono-num text-xs bg-[var(--zhd-bg)] border border-[var(--zhd-border)] text-[var(--zhd-text)]"
                      />
                      {isNativeElectron && (
                        <button
                          type="button"
                          onClick={() => handleNativeFolderBrowse(field, label)}
                          style={{ borderRadius: 'var(--zhd-radius)' }}
                          className="px-3 py-2 text-xs font-medium border border-[var(--zhd-border)] bg-[var(--zhd-surface-2)] hover:border-[var(--zhd-accent)] flex items-center gap-1.5 cursor-pointer"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                          <span>Browse</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Direct Local Media Import inside Wizard */}
              <div className="p-4 border border-[var(--zhd-border)] bg-[var(--zhd-bg)] flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-[var(--zhd-text)]">
                    Import Local Audio & Video Assets Now
                  </div>
                  <div className="text-xs text-[var(--zhd-muted)] mt-0.5">
                    {importFeedback ??
                      `${localAssetsCount} local assets currently stored in ZHD2 local database.`}
                  </div>
                </div>
                <label
                  style={{ borderRadius: 'var(--zhd-radius)' }}
                  className="px-4 py-2 text-xs font-semibold bg-[var(--zhd-accent)] text-[var(--zhd-accent-fg)] hover:bg-[var(--zhd-accent-hover)] flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>Select Local Files</span>
                  <input
                    type="file"
                    multiple
                    accept="audio/*,video/*,.mp3,.flac,.wav,.ogg,.m4a,.mp4,.webm,.mkv,.mov"
                    className="hidden"
                    onChange={(e) => {
                      void handleWizardFileImport(e.target.files);
                      e.currentTarget.value = '';
                    }}
                  />
                </label>
              </div>
            </div>
          )}

          {/* Step 2: File Associations & Windows Integration */}
          {step === 2 && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-light text-[var(--zhd-text)]">
                  File Associations & Shell Integration
                </h2>
                <p className="text-sm text-[var(--zhd-muted)] mt-1">
                  Select which media extensions open with ZHD2 Media Player in Windows Explorer.
                </p>
              </div>

              <div>
                <div className="text-xs font-medium text-[var(--zhd-muted)] mb-3">
                  Registered Media Extensions
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {ALL_FILE_ASSOCIATIONS.map((ext) => {
                    const checked = win.fileAssociations.includes(ext);
                    return (
                      <button
                        key={ext}
                        type="button"
                        onClick={() => toggleAssociation(ext)}
                        style={{ borderRadius: 'var(--zhd-radius)' }}
                        className={`px-3.5 py-3 border flex items-center justify-between font-mono-num text-xs cursor-pointer transition-colors ${
                          checked
                            ? 'bg-[var(--zhd-accent)] text-[var(--zhd-accent-fg)] border-[var(--zhd-accent)]'
                            : 'bg-[var(--zhd-bg)] text-[var(--zhd-text)] border-[var(--zhd-border)] hover:border-[var(--zhd-accent)]'
                        }`}
                      >
                        <span>{ext}</span>
                        {checked && <Check className="w-3.5 h-3.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-[var(--zhd-border)] pt-5">
                <div className="text-xs font-medium text-[var(--zhd-muted)]">
                  Windows Desktop Options
                </div>
                {(
                  [
                    {
                      key: 'createDesktopShortcut',
                      label: 'Create Desktop shortcut (ZHD2 Media Player.lnk)',
                    },
                    {
                      key: 'createStartMenuShortcut',
                      label: 'Pin ZHD2 tile to Windows Start Menu',
                    },
                    {
                      key: 'taskbarThumbnailControls',
                      label: 'Enable Windows Taskbar hover Play / Pause / Next controls',
                    },
                    {
                      key: 'hardwareAcceleration',
                      label: 'Enable Direct3D GPU acceleration for 1080p video & screensavers',
                    },
                    {
                      key: 'launchOnWindowsStartup',
                      label: 'Launch ZHD2 minimized when signing in to Windows',
                    },
                  ] as const
                ).map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center gap-3 text-sm text-[var(--zhd-text)] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={win[item.key]}
                      onChange={(e) => updateWin({ [item.key]: e.target.checked })}
                      className="w-4 h-4 accent-[var(--zhd-accent)] cursor-pointer"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Default User Configuration */}
          {step === 3 && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-light text-[var(--zhd-text)]">
                  User Configuration Defaults
                </h2>
                <p className="text-sm text-[var(--zhd-muted)] mt-1">
                  These preferences are baked into your Windows <span className="font-mono-num">config.json</span> on first launch.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-[var(--zhd-muted)]">
                    Color Scheme
                  </label>
                  <select
                    value={config.colorSchemeId}
                    onChange={(e) => onUpdateConfig({ colorSchemeId: e.target.value })}
                    style={{ borderRadius: 'var(--zhd-radius)' }}
                    className="px-3 py-2.5 text-sm bg-[var(--zhd-bg)] border border-[var(--zhd-border)] text-[var(--zhd-text)]"
                  >
                    {COLOR_SCHEMES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.origin})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-[var(--zhd-muted)]">
                    Surface Appearance
                  </label>
                  <select
                    value={config.surfaceMode}
                    onChange={(e) =>
                      onUpdateConfig({ surfaceMode: e.target.value as 'dark' | 'light' })
                    }
                    style={{ borderRadius: 'var(--zhd-radius)' }}
                    className="px-3 py-2.5 text-sm bg-[var(--zhd-bg)] border border-[var(--zhd-border)] text-[var(--zhd-text)]"
                  >
                    <option value="dark">Metro Dark</option>
                    <option value="light">Zune Light</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-[var(--zhd-muted)]">
                    Default Equalizer Preset
                  </label>
                  <select
                    value={config.eqPresetId}
                    onChange={(e) => {
                      const preset = EQ_PRESETS.find((p) => p.id === e.target.value);
                      if (preset) {
                        onUpdateConfig({
                          eqPresetId: preset.id,
                          eqBands: [...preset.gains],
                          eqEnabled: true,
                        });
                      }
                    }}
                    style={{ borderRadius: 'var(--zhd-radius)' }}
                    className="px-3 py-2.5 text-sm bg-[var(--zhd-bg)] border border-[var(--zhd-border)] text-[var(--zhd-text)]"
                  >
                    {EQ_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-[var(--zhd-muted)]">
                    Now Playing Screensaver
                  </label>
                  <select
                    value={config.screensaverMode}
                    onChange={(e) =>
                      onUpdateConfig({ screensaverMode: e.target.value as ScreensaverMode })
                    }
                    style={{ borderRadius: 'var(--zhd-radius)' }}
                    className="px-3 py-2.5 text-sm bg-[var(--zhd-bg)] border border-[var(--zhd-border)] text-[var(--zhd-text)]"
                  >
                    <option value="album-mosaic">Zune Album Mosaic</option>
                    <option value="kinetic-type">Metro Kinetic Typography</option>
                    <option value="spectrum-ribbon">Harmonic Spectrum Ribbon</option>
                    <option value="oled-clock">OLED Minimal Clock</option>
                  </select>
                </div>
              </div>

              <div className="p-4 border border-[var(--zhd-border)] bg-[var(--zhd-bg)] text-xs font-mono-num text-[var(--zhd-muted)] space-y-1">
                <div>Install Target: {win.installDir}</div>
                <div>Config Target: {win.configDir}\config.json</div>
                <div>Associations: {win.fileAssociations.join(', ') || 'None'}</div>
              </div>
            </div>
          )}

          {/* Step 4: Install & Apply */}
          {step === 4 && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-light text-[var(--zhd-text)]">
                  Ready to Install Local Assets & Config
                </h2>
                <p className="text-sm text-[var(--zhd-muted)] mt-1">
                  Review your installation summary and click Install to write your ZHD2 configuration and prepare the Windows EXE build bundle.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs border border-[var(--zhd-border)] bg-[var(--zhd-bg)] p-5">
                <div>
                  <span className="text-[var(--zhd-muted)]">Package:</span>{' '}
                  <span className="font-medium text-[var(--zhd-text)]">
                    {win.edition === 'installer-exe' ? 'NSIS Windows Installer (.exe)' : 'Portable Standalone (.exe)'} ({win.architecture})
                  </span>
                </div>
                <div>
                  <span className="text-[var(--zhd-muted)]">Theme:</span>{' '}
                  <span className="font-medium text-[var(--zhd-text)]">
                    {config.colorSchemeId} · {config.surfaceMode}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--zhd-muted)]">Install Path:</span>{' '}
                  <span className="font-mono-num text-[var(--zhd-text)]">{win.installDir}</span>
                </div>
                <div>
                  <span className="text-[var(--zhd-muted)]">Media Assets:</span>{' '}
                  <span className="font-mono-num text-[var(--zhd-text)]">
                    {mediaItems.length} indexed ({localAssetsCount} local)
                  </span>
                </div>
              </div>

              {installing || installLog.length > 0 ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[var(--zhd-text)]">
                      {installing ? 'Applying Windows setup...' : 'Installation steps completed'}
                    </span>
                    <span className="font-mono-num text-[var(--zhd-accent)]">{installProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-[var(--zhd-border)] overflow-hidden">
                    <div
                      className="h-full bg-[var(--zhd-accent)] transition-all duration-200"
                      style={{ width: `${installProgress}%` }}
                    />
                  </div>
                  <div className="p-4 bg-[var(--zhd-bg)] border border-[var(--zhd-border)] font-mono-num text-xs text-[var(--zhd-muted)] space-y-1.5 max-h-48 overflow-y-auto">
                    {installLog.map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <button
                    type="button"
                    onClick={runInstallation}
                    style={{ borderRadius: 'var(--zhd-radius)' }}
                    className="px-6 py-3 text-sm font-semibold bg-[var(--zhd-accent)] text-[var(--zhd-accent-fg)] hover:bg-[var(--zhd-accent-hover)] flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <HardDrive className="w-4 h-4" />
                    <span>Install Configuration & Prepare EXE Kit</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Complete & Export Windows EXE Build Kit */}
          {step === 5 && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-light text-[var(--zhd-text)]">
                  ZHD2 Windows Setup Complete
                </h2>
                <p className="text-sm text-[var(--zhd-muted)] mt-1 leading-relaxed">
                  Your local asset preferences and user configuration are saved. This repository includes complete Electron + NSIS packaging (<span className="font-mono-num">electron/main.cjs</span>, <span className="font-mono-num">electron-builder.yml</span>, <span className="font-mono-num">scripts/build-windows-exe.ps1</span>). Export your customized config and installer scripts below to build your Windows <span className="font-mono-num">.exe</span>.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={handleDownloadConfigJson}
                  style={{ borderRadius: 'var(--zhd-radius)' }}
                  className="p-5 border border-[var(--zhd-border)] bg-[var(--zhd-bg)] hover:border-[var(--zhd-accent)] text-left flex flex-col justify-between gap-4 cursor-pointer transition-colors"
                >
                  <Settings2 className="w-5 h-5 text-[var(--zhd-accent)]" />
                  <div>
                    <div className="font-display text-base font-semibold text-[var(--zhd-text)]">
                      Download zhd2-config.json
                    </div>
                    <div className="text-xs text-[var(--zhd-muted)] mt-1">
                      Your theme, 10-band EQ, screensaver, and local folder paths.
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadNsisScript}
                  style={{ borderRadius: 'var(--zhd-radius)' }}
                  className="p-5 border border-[var(--zhd-border)] bg-[var(--zhd-bg)] hover:border-[var(--zhd-accent)] text-left flex flex-col justify-between gap-4 cursor-pointer transition-colors"
                >
                  <FileCode2 className="w-5 h-5 text-[var(--zhd-accent)]" />
                  <div>
                    <div className="font-display text-base font-semibold text-[var(--zhd-text)]">
                      Download installer.nsh
                    </div>
                    <div className="text-xs text-[var(--zhd-muted)] mt-1">
                      NSIS Windows installer macro pre-configured with your file associations.
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadBuildScript}
                  style={{ borderRadius: 'var(--zhd-radius)' }}
                  className="p-5 border border-[var(--zhd-border)] bg-[var(--zhd-bg)] hover:border-[var(--zhd-accent)] text-left flex flex-col justify-between gap-4 cursor-pointer transition-colors"
                >
                  <Download className="w-5 h-5 text-[var(--zhd-accent)]" />
                  <div>
                    <div className="font-display text-base font-semibold text-[var(--zhd-text)]">
                      Download build-zhd2-exe.ps1
                    </div>
                    <div className="text-xs text-[var(--zhd-muted)] mt-1">
                      One-click PowerShell script to compile ZHD2-{win.architecture}.exe on Windows.
                    </div>
                  </div>
                </button>
              </div>

              <div className="p-4 border border-[var(--zhd-border)] bg-[var(--zhd-bg)] font-mono-num text-xs text-[var(--zhd-muted)] space-y-1">
                <div className="text-[var(--zhd-text)] font-medium mb-1">
                  Compile to Windows .EXE on your PC:
                </div>
                <div>powershell -ExecutionPolicy Bypass -File .\scripts\build-windows-exe.ps1</div>
              </div>
            </div>
          )}

          {/* Wizard Footer Navigation */}
          <div className="flex items-center justify-between pt-5 border-t border-[var(--zhd-border)]">
            <button
              type="button"
              disabled={step === 0 || installing}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              style={{ borderRadius: 'var(--zhd-radius)' }}
              className="px-4 py-2 text-xs font-medium border border-[var(--zhd-border)] text-[var(--zhd-text)] hover:border-[var(--zhd-accent)] disabled:opacity-35 flex items-center gap-2 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(5, s + 1))}
                style={{ borderRadius: 'var(--zhd-radius)' }}
                className="px-5 py-2 text-xs font-semibold bg-[var(--zhd-accent)] text-[var(--zhd-accent-fg)] hover:bg-[var(--zhd-accent-hover)] flex items-center gap-2 cursor-pointer transition-colors"
              >
                <span>Next Step</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : step === 4 ? (
              <button
                type="button"
                disabled={installing}
                onClick={runInstallation}
                style={{ borderRadius: 'var(--zhd-radius)' }}
                className="px-5 py-2 text-xs font-semibold bg-[var(--zhd-accent)] text-[var(--zhd-accent-fg)] hover:bg-[var(--zhd-accent-hover)] disabled:opacity-50 cursor-pointer transition-colors"
              >
                {installing ? 'Installing...' : 'Run Setup'}
              </button>
            ) : (
              <button
                type="button"
                onClick={onFinishAndLaunch}
                style={{ borderRadius: 'var(--zhd-radius)' }}
                className="px-5 py-2 text-xs font-semibold bg-[var(--zhd-accent)] text-[var(--zhd-accent-fg)] hover:bg-[var(--zhd-accent-hover)] flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Launch ZHD2 Player</span>
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
