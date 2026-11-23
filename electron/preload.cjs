const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('zhd2Desktop', {
  isDesktop: true,
  platform: process.platform,
  selectFolder: (title) => ipcRenderer.invoke('zhd2:select-folder', title),
  getDefaultPaths: () => ipcRenderer.invoke('zhd2:get-default-paths'),
  saveConfig: (config) => ipcRenderer.invoke('zhd2:save-config', config),
  loadConfig: () => ipcRenderer.invoke('zhd2:load-config'),
  scanMediaFolder: (folderPath) => ipcRenderer.invoke('zhd2:scan-media-folder', folderPath),
});
