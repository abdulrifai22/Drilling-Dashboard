const { contextBridge, ipcRenderer } = require('electron');

// API aman yang diekspos ke halaman dashboard. Dashboard asli (src/index.html)
// tidak tahu-menahu soal ini — hanya app-shell.js (di-inject di bawah) yang memakainya.
contextBridge.exposeInMainWorld('dashboardAPI', {
  getAppInfo: () => ipcRenderer.invoke('app:get-info'),
  getChangelog: () => ipcRenderer.invoke('app:get-changelog'),
  openDataFolder: () => ipcRenderer.invoke('app:open-data-folder'),
  openExternal: (url) => ipcRenderer.invoke('app:open-external', url),

  checkForUpdate: () => ipcRenderer.invoke('update:check'),
  startUpdateDownload: () => ipcRenderer.invoke('update:download'),
  quitAndInstall: () => ipcRenderer.invoke('update:install'),
  onUpdateStatus: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('update:status', listener);
    return () => ipcRenderer.removeListener('update:status', listener);
  },

  exportBackup: (jsonString) => ipcRenderer.invoke('backup:export', jsonString),
  importBackup: () => ipcRenderer.invoke('backup:import'),
  autoBackup: (jsonString, label) => ipcRenderer.invoke('backup:auto', jsonString, label),

  logClientError: (message) => ipcRenderer.invoke('log:client-error', message),

  windowMinimize: () => ipcRenderer.invoke('window:minimize'),
  windowToggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
  windowIsMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  windowClose: () => ipcRenderer.invoke('window:close'),
  windowToggleFullscreen: () => ipcRenderer.invoke('window:toggle-fullscreen'),
  windowToggleDevTools: () => ipcRenderer.invoke('window:toggle-devtools'),
  onWindowState: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('window:state', listener);
    return () => ipcRenderer.removeListener('window:state', listener);
  },
});

// Menyisipkan integrasi Electron (update banner, welcome screen, panel App Settings)
// TANPA menyentuh satu baris pun kode dashboard asli di index.html.
window.addEventListener('DOMContentLoaded', () => {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'css/app-shell.css';
  document.head.appendChild(link);

  const script = document.createElement('script');
  script.src = 'js/app-shell.js';
  document.body.appendChild(script);
});
