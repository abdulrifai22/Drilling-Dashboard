const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const windowStateKeeper = require('electron-window-state');
const logger = require('./logger');
const { Updater } = require('./updater/updater');

let mainWindow = null;
let updater = null;

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function getUpdateConfigPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'config', 'update.config.json');
  }
  return path.join(__dirname, 'config', 'update.config.json');
}

function readUpdateConfig() {
  try {
    return JSON.parse(fs.readFileSync(getUpdateConfigPath(), 'utf8'));
  } catch (_) {
    return { checkOnStartup: true, checkDelaySeconds: 3 };
  }
}

function getChangelogPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'CHANGELOG.md');
  }
  return path.join(__dirname, 'CHANGELOG.md');
}

function createWindow() {
  const windowState = windowStateKeeper({
    defaultWidth: 1400,
    defaultHeight: 900,
    file: 'window-state.json',
  });

  mainWindow = new BrowserWindow({
    x: windowState.x,
    y: windowState.y,
    width: windowState.width,
    height: windowState.height,
    minWidth: 1024,
    minHeight: 700,
    icon: path.join(__dirname, 'build', 'icon.ico'),
    backgroundColor: '#0a0a1f',
    frame: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  windowState.manage(mainWindow);

  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.on('maximize', () => mainWindow.webContents.send('window:state', { maximized: true }));
  mainWindow.on('unmaximize', () => mainWindow.webContents.send('window:state', { maximized: false }));
  mainWindow.on('enter-full-screen', () => mainWindow.webContents.send('window:state', { fullscreen: true }));
  mainWindow.on('leave-full-screen', () => mainWindow.webContents.send('window:state', { fullscreen: false }));

  // Cegah navigasi keluar dari app / popup window; buka link eksternal di browser sistem.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    logger.error(`Render process gone: ${details.reason}`);
    showFatalErrorDialog('Terjadi kesalahan pada aplikasi (proses render berhenti).');
  });
  mainWindow.on('unresponsive', () => {
    logger.error('Window tidak merespons (unresponsive).');
    showFatalErrorDialog('Aplikasi tidak merespons.');
  });

  updater = new Updater(mainWindow);
  const updCfg = readUpdateConfig();
  if (updCfg.checkOnStartup !== false) {
    const delayMs = Math.max(0, (updCfg.checkDelaySeconds || 3)) * 1000;
    setTimeout(() => updater.checkForUpdates(), delayMs);
  }
}

function showFatalErrorDialog(message) {
  if (!mainWindow) return;
  const choice = dialog.showMessageBoxSync(mainWindow, {
    type: 'error',
    title: 'Drilling Dashboard',
    message,
    buttons: ['Try Again', 'Open Data Folder', 'Tutup'],
    defaultId: 0,
    cancelId: 2,
  });
  if (choice === 0) {
    mainWindow.reload();
  } else if (choice === 1) {
    shell.openPath(app.getPath('userData'));
  }
}

// ---------- IPC handlers ----------

ipcMain.handle('app:get-info', () => ({
  name: 'Drilling Dashboard',
  version: app.getVersion(),
  publisher: 'Drilling Dashboard Team',
  isPackaged: app.isPackaged,
}));

ipcMain.handle('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window:toggle-maximize', () => {
  if (!mainWindow) return false;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
  return mainWindow.isMaximized();
});

ipcMain.handle('window:is-maximized', () => (mainWindow ? mainWindow.isMaximized() : false));

ipcMain.handle('window:close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('window:toggle-fullscreen', () => {
  if (!mainWindow) return false;
  mainWindow.setFullScreen(!mainWindow.isFullScreen());
  return mainWindow.isFullScreen();
});

ipcMain.handle('window:toggle-devtools', () => {
  if (mainWindow && !app.isPackaged) mainWindow.webContents.toggleDevTools();
});

ipcMain.handle('app:get-changelog', () => {
  try {
    return fs.readFileSync(getChangelogPath(), 'utf8');
  } catch (err) {
    return `Changelog tidak dapat dibaca: ${err.message}`;
  }
});

ipcMain.handle('app:open-data-folder', () => {
  shell.openPath(app.getPath('userData'));
  return true;
});

ipcMain.handle('app:open-external', (_event, url) => {
  if (typeof url === 'string' && /^https?:\/\//.test(url)) {
    shell.openExternal(url);
    return true;
  }
  return false;
});

ipcMain.handle('update:check', () => updater && updater.checkForUpdates());
ipcMain.handle('update:download', () => updater && updater.downloadUpdate());
ipcMain.handle('update:install', () => updater && updater.quitAndInstall());

ipcMain.handle('backup:export', async (_event, jsonString) => {
  if (!mainWindow) return { canceled: true };
  const defaultName = `dashboard-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Backup',
    defaultPath: path.join(app.getPath('documents'), defaultName),
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (canceled || !filePath) return { canceled: true };
  try {
    fs.writeFileSync(filePath, jsonString, 'utf8');
    logger.info(`Backup diexport ke: ${filePath}`);
    return { canceled: false, filePath };
  } catch (err) {
    logger.error(`Export backup gagal: ${err.message}`);
    return { canceled: true, error: err.message };
  }
});

ipcMain.handle('backup:import', async () => {
  if (!mainWindow) return { canceled: true };
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Backup',
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (canceled || !filePaths || !filePaths[0]) return { canceled: true };
  try {
    const content = fs.readFileSync(filePaths[0], 'utf8');
    JSON.parse(content); // validasi JSON valid sebelum dikirim ke renderer
    logger.info(`Backup diimport dari: ${filePaths[0]}`);
    return { canceled: false, content };
  } catch (err) {
    logger.error(`Import backup gagal: ${err.message}`);
    return { canceled: true, error: err.message };
  }
});

ipcMain.handle('backup:auto', (_event, jsonString, label) => {
  try {
    const dir = path.join(app.getPath('userData'), 'backups');
    fs.mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(dir, `auto-backup-${label || 'auto'}-${stamp}.json`);
    fs.writeFileSync(filePath, jsonString, 'utf8');
    logger.info(`Auto-backup dibuat: ${filePath}`);
    return { ok: true, filePath };
  } catch (err) {
    logger.error(`Auto-backup gagal: ${err.message}`);
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('log:client-error', (_event, message) => {
  logger.error(`[renderer] ${String(message).slice(0, 500)}`);
  return true;
});

// ---------- App lifecycle ----------

app.whenReady().then(() => {
  app.setAppUserModelId('com.drillingdashboard.app');
  logger.init(app.getPath('userData'));
  logger.info(`Aplikasi start, versi ${app.getVersion()}`);
  Menu.setApplicationMenu(null);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  logger.info('Aplikasi ditutup.');
  if (process.platform !== 'darwin') app.quit();
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught exception: ${err.stack || err.message}`);
});
