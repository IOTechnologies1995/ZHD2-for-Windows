const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');

const CONFIG_DIR = path.join(app.getPath('appData'), 'ZHD2');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const DIST_DIR = path.join(__dirname, '..', 'dist');
const AUDIO_EXTS = new Set(['.mp3', '.flac', '.wav', '.ogg', '.m4a', '.aac']);
const VIDEO_EXTS = new Set(['.mp4', '.webm', '.mkv', '.mov', '.avi', '.m4v']);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

let mainWindow = null;
let staticServer = null;

function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function startDistServer() {
  return new Promise((resolve) => {
    staticServer = http.createServer((req, res) => {
      const reqUrl = new URL(req.url || '/', 'http://127.0.0.1');
      const relPath = decodeURIComponent(reqUrl.pathname).replace(/^\/+/, '');
      let filePath = path.join(DIST_DIR, relPath || 'index.html');

      if (!filePath.startsWith(DIST_DIR) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(DIST_DIR, 'index.html');
      }

      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    });

    staticServer.listen(0, '127.0.0.1', () => {
      const address = staticServer.address();
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#0b0b0d',
    title: 'ZHD2 Media Player',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const devUrl = process.env.ZHD2_DEV_URL;
  if (devUrl) {
    await mainWindow.loadURL(devUrl);
  } else {
    const localUrl = await startDistServer();
    await mainWindow.loadURL(localUrl);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  ensureConfigDir();
  void createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (staticServer) {
    staticServer.close();
    staticServer = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC: Native Windows Folder Picker
ipcMain.handle('zhd2:select-folder', async (_event, title) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: title || 'Select Folder',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

// IPC: Return standard Windows user directories
ipcMain.handle('zhd2:get-default-paths', async () => {
  const home = os.homedir();
  return {
    installDir: path.join(process.env.ProgramFiles || 'C:\\Program Files', 'ZHD2'),
    musicDir: app.getPath('music') || path.join(home, 'Music'),
    videoDir: app.getPath('videos') || path.join(home, 'Videos'),
    assetsCacheDir: path.join(app.getPath('userData'), 'Assets'),
    configDir: CONFIG_DIR,
  };
});

// IPC: Save %APPDATA%\ZHD2\config.json
ipcMain.handle('zhd2:save-config', async (_event, config) => {
  try {
    ensureConfigDir();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    return { ok: true, path: CONFIG_FILE };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

// IPC: Load %APPDATA%\ZHD2\config.json
ipcMain.handle('zhd2:load-config', async () => {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return null;
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch {
    return null;
  }
});

// IPC: Scan local Windows folder for audio and video files
ipcMain.handle('zhd2:scan-media-folder', async (_event, folderPath) => {
  const found = [];
  function walk(dir, depth) {
    if (depth > 3 || !fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath, depth + 1);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (AUDIO_EXTS.has(ext) || VIDEO_EXTS.has(ext)) {
          const stat = fs.statSync(fullPath);
          found.push({
            name: entry.name,
            path: fullPath,
            size: stat.size,
            ext,
            type: VIDEO_EXTS.has(ext) ? 'video' : 'audio',
          });
        }
      }
    }
  }
  walk(folderPath, 0);
  return found;
});
