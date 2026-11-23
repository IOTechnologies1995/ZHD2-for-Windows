export type MediaType = 'audio' | 'video';

export type NavSection =
  | 'quickplay'
  | 'library'
  | 'now-playing'
  | 'equalizer'
  | 'customize'
  | 'windows-setup';

export type SurfaceMode = 'dark' | 'light';

export type CornerStyle = 'sharp' | 'soft';

export type ScreensaverMode =
  | 'album-mosaic'
  | 'kinetic-type'
  | 'spectrum-ribbon'
  | 'oled-clock';

export type RepeatMode = 'off' | 'all' | 'one';

export interface MediaItem {
  id: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  year: number;
  duration: number; // seconds
  type: MediaType;
  format: string; // e.g., "FLAC 24-bit", "MP3 320 kbps", "MP4 1080p"
  bitrate: string;
  artwork: string;
  source: 'builtin' | 'local';
  synthPreset?: number; // index for built-in synth engine
  videoScene?: 'cinema' | 'horizon' | 'transit'; // built-in HD canvas video scene
  objectUrl?: string; // for local imported files
  fileName?: string;
  fileSize?: number;
  addedAt: number;
}

export interface ColorScheme {
  id: string;
  name: string;
  origin: string;
  accent: string;
  accentHover: string;
  accentFg: string;
  secondaryTile: string;
  darkBgTint?: string;
  darkSurfaceTint?: string;
}

export interface EqPreset {
  id: string;
  name: string;
  gains: number[]; // 10 bands: 32, 64, 125, 250, 500, 1k, 2k, 4k, 8k, 16k
}

export interface WindowsInstallConfig {
  installed: boolean;
  installedAt: string | null;
  edition: 'installer-exe' | 'portable-exe';
  architecture: 'x64' | 'arm64';
  installDir: string;
  musicDir: string;
  videoDir: string;
  assetsCacheDir: string;
  configDir: string;
  fileAssociations: string[];
  createDesktopShortcut: boolean;
  createStartMenuShortcut: boolean;
  launchOnWindowsStartup: boolean;
  hardwareAcceleration: boolean;
  taskbarThumbnailControls: boolean;
}

export interface ZhdConfig {
  colorSchemeId: string;
  surfaceMode: SurfaceMode;
  cornerStyle: CornerStyle;
  screensaverMode: ScreensaverMode;
  screensaverTimeoutSec: number; // 0 = disabled
  eqEnabled: boolean;
  eqPresetId: string;
  eqBands: number[];
  preampDb: number;
  stereoBalance: number; // -1 to 1
  volume: number; // 0 to 1
  favoriteIds: string[];
  recentIds: string[];
  windowsInstall: WindowsInstallConfig;
}

export interface Zhd2DesktopBridge {
  isDesktop: boolean;
  platform: string;
  selectFolder: (title: string) => Promise<string | null>;
  saveConfig: (config: ZhdConfig) => Promise<{ ok: boolean; path?: string }>;
  loadConfig: () => Promise<ZhdConfig | null>;
  getDefaultPaths: () => Promise<{
    installDir: string;
    musicDir: string;
    videoDir: string;
    assetsCacheDir: string;
    configDir: string;
  }>;
  scanMediaFolder: (folderPath: string) => Promise<
    Array<{
      name: string;
      path: string;
      size: number;
      ext: string;
      type: MediaType;
    }>
  >;
}

declare global {
  interface Window {
    zhd2Desktop?: Zhd2DesktopBridge;
  }
}
