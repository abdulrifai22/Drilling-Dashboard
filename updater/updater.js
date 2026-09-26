const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { autoUpdater } = require('electron-updater');
const logger = require('../logger');

function getConfigPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'config', 'update.config.json');
  }
  return path.join(__dirname, '..', 'config', 'update.config.json');
}

function loadConfig() {
  try {
    const raw = fs.readFileSync(getConfigPath(), 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    logger.warn(`Gagal membaca update.config.json: ${err.message}`);
    return null;
  }
}

function isConfigured(cfg) {
  return !!(
    cfg &&
    cfg.provider === 'github' &&
    cfg.owner &&
    cfg.repo &&
    !String(cfg.owner).startsWith('YOUR_') &&
    !String(cfg.repo).startsWith('YOUR_')
  );
}

// Perbandingan semver MAJOR.MINOR.PATCH numerik (skema versi resmi aplikasi ini).
// Sengaja tidak menangani prerelease/build-metadata karena tidak dipakai di project ini.
function compareVersions(a, b) {
  const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

class Updater {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.cfg = loadConfig();
    this.configured = isConfigured(this.cfg);
    this.downloaded = false;

    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;

    if (this.configured) {
      autoUpdater.setFeedURL({
        provider: 'github',
        owner: this.cfg.owner,
        repo: this.cfg.repo,
      });
    }

    autoUpdater.on('checking-for-update', () => {
      logger.info('Update check: mencari pembaruan...');
      this.send('checking');
    });

    autoUpdater.on('update-available', (info) => {
      logger.info(`Update check: tersedia versi ${info.version}`);
      this.send('available', {
        currentVersion: app.getVersion(),
        latestVersion: info.version,
        releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : '',
        releaseDate: info.releaseDate || null,
      });
    });

    autoUpdater.on('update-not-available', () => {
      logger.info('Update check: sudah versi terbaru');
      this.send('not-available', { currentVersion: app.getVersion() });
    });

    autoUpdater.on('download-progress', (progress) => {
      this.send('downloading', { percent: Math.round(progress.percent) });
    });

    autoUpdater.on('update-downloaded', (info) => {
      this.downloaded = true;
      logger.info(`Update selesai didownload: versi ${info.version}`);
      this.send('downloaded', { latestVersion: info.version });
    });

    autoUpdater.on('error', (err) => {
      logger.error(`Update gagal: ${err.message}`);
      this.send('error', { message: err.message });
    });
  }

  send(state, payload) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('update:status', { state, payload: payload || null });
    }
  }

  async checkForUpdates() {
    if (!this.configured) {
      logger.info('Update check dilewati: config/update.config.json belum diisi (masih placeholder).');
      this.send('not-configured');
      return;
    }
    try {
      await autoUpdater.checkForUpdates();
    } catch (err) {
      logger.error(`Update check error: ${err.message}`);
      this.send('error', { message: err.message });
    }
  }

  async downloadUpdate() {
    if (!this.configured) return;
    try {
      await autoUpdater.downloadUpdate();
    } catch (err) {
      logger.error(`Download update error: ${err.message}`);
      this.send('error', { message: err.message });
    }
  }

  quitAndInstall() {
    if (!this.downloaded) return;
    logger.info('Menjalankan quitAndInstall...');
    autoUpdater.quitAndInstall();
  }
}

module.exports = { Updater, compareVersions };
