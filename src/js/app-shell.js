/*
 * app-shell.js — lapisan integrasi Electron untuk dashboard.
 * Di-inject oleh preload.js SETELAH dashboard asli selesai load. Script ini
 * TIDAK PERNAH mengubah atau memanggil ulang fungsi internal dashboard —
 * hanya menambah UI baru (banner update, welcome screen, panel App Settings)
 * dan membaca/menulis localStorage lewat key yang sudah dipakai dashboard.
 */
(function () {
  'use strict';

  if (!window.dashboardAPI) return; // bukan berjalan di Electron, jangan lakukan apa-apa

  var BACKUP_KEYS = [
    'oee_dashboard_upload_history_v1',
    'oee_dashboard_filters_v1',
    'ggm_sample_gs_cfg',
    'ggm_sample_gs_cache',
    'oee_drilling_holeplan_v1',
  ];
  var ONBOARDING_KEY = 'dds_onboarding_done_v1';

  var appInfo = { name: 'Drilling Dashboard', version: '', publisher: '' };
  var manualCheckInFlight = false;

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) { node.appendChild(c); });
    return node;
  }

  function toast(message) {
    var t = el('div', { class: 'dds-toast' }, []);
    t.textContent = message;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 4000);
  }

  // ---------- Backup helpers ----------

  function collectBackupPayload() {
    var data = {};
    BACKUP_KEYS.forEach(function (key) {
      var val = localStorage.getItem(key);
      if (val !== null) data[key] = val;
    });
    return JSON.stringify(
      { exportedAt: new Date().toISOString(), appVersion: appInfo.version, data: data },
      null,
      2
    );
  }

  function restoreBackupPayload(jsonText) {
    var parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (e) {
      toast('File backup tidak valid (bukan JSON).');
      return false;
    }
    if (!parsed || typeof parsed.data !== 'object') {
      toast('Format file backup tidak dikenali.');
      return false;
    }
    Object.keys(parsed.data).forEach(function (key) {
      if (BACKUP_KEYS.indexOf(key) !== -1) {
        localStorage.setItem(key, parsed.data[key]);
      }
    });
    return true;
  }

  async function doExportBackup() {
    var json = collectBackupPayload();
    var res = await window.dashboardAPI.exportBackup(json);
    if (res && res.canceled) return;
    if (res && res.error) toast('Export backup gagal: ' + res.error);
    else toast('Backup berhasil disimpan.');
  }

  async function doImportBackup() {
    var res = await window.dashboardAPI.importBackup();
    if (res && res.canceled) return;
    if (res && res.error) {
      toast('Import backup gagal: ' + res.error);
      return;
    }
    if (restoreBackupPayload(res.content)) {
      toast('Import berhasil, memuat ulang...');
      setTimeout(function () { location.reload(); }, 1200);
    }
  }

  // ---------- Welcome / first run ----------

  function maybeShowWelcome() {
    if (localStorage.getItem(ONBOARDING_KEY)) return;
    var overlay = el('div', { id: 'dds-welcome-overlay', class: 'show' }, [
      el('div', { class: 'dds-card' }, [
        el('h1', { html: 'Selamat datang di ' + appInfo.name }, []),
        el('p', { html: 'Version ' + appInfo.version }, []),
        (function () {
          var btn = el('button', {}, []);
          btn.textContent = 'Mulai';
          btn.onclick = function () {
            localStorage.setItem(ONBOARDING_KEY, '1');
            overlay.remove();
          };
          return btn;
        })(),
      ]),
    ]);
    document.body.appendChild(overlay);
  }

  // ---------- Update banner ----------

  var banner, bannerMsg, btnUpdateNow, btnRemindLater, btnChangelog;

  function buildBanner() {
    bannerMsg = el('div', { class: 'dds-msg' }, []);
    btnUpdateNow = el('button', { class: 'dds-primary' }, []);
    btnUpdateNow.textContent = 'Update Sekarang';
    btnRemindLater = el('button', {}, []);
    btnRemindLater.textContent = 'Ingatkan Nanti';
    btnChangelog = el('button', {}, []);
    btnChangelog.textContent = 'Changelog';

    btnRemindLater.onclick = function () { banner.classList.remove('show'); };
    btnChangelog.onclick = showChangelogModal;

    banner = el('div', { id: 'dds-update-banner' }, [
      bannerMsg,
      el('div', { class: 'dds-actions' }, [btnUpdateNow, btnRemindLater, btnChangelog]),
    ]);
    document.body.appendChild(banner);
  }

  function showChangelogModal() {
    window.dashboardAPI.getChangelog().then(function (text) {
      var modal = el('div', {
        style: 'position:fixed;inset:0;z-index:9999999;background:rgba(6,10,16,.85);display:flex;align-items:center;justify-content:center;',
      }, []);
      var box = el('div', {
        style: 'max-width:560px;max-height:70vh;overflow:auto;background:#0f1a26;border:1px solid #22384f;border-radius:12px;padding:22px 24px;color:#eaf2ff;font-size:13px;white-space:pre-wrap;',
      }, []);
      box.textContent = text;
      var closeBtn = el('button', {
        style: 'margin-top:16px;cursor:pointer;border:none;background:#1f4d78;color:#fff;padding:8px 16px;border-radius:6px;',
      }, []);
      closeBtn.textContent = 'Tutup';
      closeBtn.onclick = function () { modal.remove(); };
      box.appendChild(el('div', {}, [closeBtn]));
      modal.appendChild(box);
      modal.onclick = function (e) { if (e.target === modal) modal.remove(); };
      document.body.appendChild(modal);
    });
  }

  function handleUpdateStatus(data) {
    if (!banner) buildBanner();
    var state = data.state;
    var payload = data.payload || {};

    if (state === 'available') {
      manualCheckInFlight = false;
      bannerMsg.innerHTML =
        'Update tersedia — versi saat ini <b>' + payload.currentVersion +
        '</b>, versi terbaru <b>' + payload.latestVersion + '</b>.';
      btnUpdateNow.disabled = false;
      btnUpdateNow.textContent = 'Update Sekarang';
      btnUpdateNow.onclick = startUpdateFlow;
      banner.classList.add('show');
    } else if (state === 'not-available') {
      if (manualCheckInFlight) {
        manualCheckInFlight = false;
        toast('Anda menggunakan versi terbaru.');
      }
    } else if (state === 'not-configured') {
      if (manualCheckInFlight) {
        manualCheckInFlight = false;
        toast('Update checker belum dikonfigurasi (config/update.config.json).');
      }
    } else if (state === 'downloading') {
      btnUpdateNow.disabled = true;
      btnUpdateNow.textContent = 'Mendownload... ' + (payload.percent || 0) + '%';
      banner.classList.add('show');
    } else if (state === 'downloaded') {
      bannerMsg.innerHTML = 'Update <b>' + payload.latestVersion + '</b> siap diinstall.';
      btnUpdateNow.disabled = false;
      btnUpdateNow.textContent = 'Restart & Install';
      btnUpdateNow.onclick = function () { window.dashboardAPI.quitAndInstall(); };
      banner.classList.add('show');
    } else if (state === 'error') {
      if (manualCheckInFlight) {
        manualCheckInFlight = false;
        toast('Gagal memeriksa update: ' + payload.message);
      }
      btnUpdateNow.disabled = false;
    }
  }

  async function startUpdateFlow() {
    btnUpdateNow.disabled = true;
    btnUpdateNow.textContent = 'Menyiapkan backup...';
    try {
      var json = collectBackupPayload();
      await window.dashboardAPI.autoBackup(json, 'pre-update');
    } catch (e) {
      // backup gagal tidak boleh menghalangi proses update; sudah dicatat di log main process
    }
    window.dashboardAPI.startUpdateDownload();
  }

  // ---------- Panel App Settings (Version / Update / Backup / About) ----------

  function injectSettingsPanel() {
    var tab = document.getElementById('tab-settings');
    if (!tab) return;

    var statusText = el('div', { class: 'dds-status-text' }, []);

    var checkBtn = el('button', {}, []);
    checkBtn.textContent = 'Check for Update';
    checkBtn.onclick = function () {
      manualCheckInFlight = true;
      statusText.textContent = 'Memeriksa pembaruan...';
      window.dashboardAPI.checkForUpdate();
    };

    var changelogBtn = el('button', {}, []);
    changelogBtn.textContent = 'Changelog';
    changelogBtn.onclick = showChangelogModal;

    var exportBtn = el('button', {}, []);
    exportBtn.textContent = 'Export Backup';
    exportBtn.onclick = doExportBackup;

    var importBtn = el('button', {}, []);
    importBtn.textContent = 'Import Backup';
    importBtn.onclick = doImportBackup;

    var openFolderBtn = el('button', {}, []);
    openFolderBtn.textContent = 'Open Data Folder';
    openFolderBtn.onclick = function () { window.dashboardAPI.openDataFolder(); };

    var block = el('div', { id: 'dds-app-settings-block' }, [
      el('h3', { html: 'Application' }, []),
      el('div', { class: 'dds-info-line' }, []),
      el('div', { class: 'dds-btn-row' }, [checkBtn, changelogBtn]),
      el('div', { class: 'dds-btn-row' }, [exportBtn, importBtn, openFolderBtn]),
      statusText,
    ]);
    block.querySelector('.dds-info-line').innerHTML =
      appInfo.name + ' — Version ' + appInfo.version + '<br>Publisher: ' + appInfo.publisher;

    tab.appendChild(block);
  }

  // ---------- Custom title bar (menggantikan title bar putih bawaan Windows) ----------

  function showAboutModal() {
    var modal = el('div', {
      style: 'position:fixed;inset:0;z-index:9999999;background:rgba(6,10,16,.85);display:flex;align-items:center;justify-content:center;',
    }, []);
    var box = el('div', {
      style: 'max-width:420px;background:#0f1a26;border:1px solid #22384f;border-radius:12px;padding:24px 26px;color:#eaf2ff;font-size:13px;text-align:center;',
    }, []);
    var title = el('h2', { style: 'margin:0 0 6px;font-size:17px;' }, []);
    title.textContent = appInfo.name;
    var detail = el('div', { style: 'color:#9db3c8;margin-bottom:18px;white-space:pre-line;' }, []);
    detail.textContent = 'Version ' + appInfo.version + '\nDeveloped by: ' + appInfo.publisher + '\nCopyright © 2026';
    var closeBtn = el('button', {
      style: 'cursor:pointer;border:none;background:#1f4d78;color:#fff;padding:8px 18px;border-radius:6px;',
    }, []);
    closeBtn.textContent = 'Tutup';
    closeBtn.onclick = function () { modal.remove(); };
    box.appendChild(title);
    box.appendChild(detail);
    box.appendChild(closeBtn);
    modal.appendChild(box);
    modal.onclick = function (e) { if (e.target === modal) modal.remove(); };
    document.body.appendChild(modal);
  }

  function closeAllTbMenus() {
    document.querySelectorAll('.dds-tb-menu-item.open').forEach(function (n) { n.classList.remove('open'); });
  }

  function buildTitleBar() {
    var icon = el('img', { class: 'dds-tb-icon', src: 'assets/icon-source.png' }, []);

    var titleText = el('span', { class: 'dds-tb-title' }, []);
    titleText.textContent = document.title;

    function menuItem(label, actions) {
      var dropdown = el('div', { class: 'dds-tb-dropdown' }, actions.map(function (a) {
        if (a === null) return el('hr', {}, []);
        var btn = el('button', {}, []);
        btn.textContent = a.label;
        btn.onclick = function (e) {
          e.stopPropagation();
          closeAllTbMenus();
          a.run();
        };
        if (a.devOnly) btn.classList.add('dds-dev-only');
        return btn;
      }));
      var item = el('div', { class: 'dds-tb-menu-item' }, [
        el('span', {}, []),
        dropdown,
      ]);
      item.firstChild.textContent = label;
      item.addEventListener('click', function (e) {
        e.stopPropagation();
        var wasOpen = item.classList.contains('open');
        closeAllTbMenus();
        if (!wasOpen) item.classList.add('open');
      });
      return item;
    }

    var fileMenu = menuItem('File', [
      { label: 'Export Backup', run: doExportBackup },
      { label: 'Import Backup', run: doImportBackup },
      null,
      { label: 'Exit', run: function () { window.dashboardAPI.windowClose(); } },
    ]);

    var viewActions = [
      { label: 'Reload', run: function () { location.reload(); } },
      { label: 'Fullscreen', run: function () { window.dashboardAPI.windowToggleFullscreen(); } },
    ];
    if (!appInfo.isPackaged) {
      viewActions.push({ label: 'Toggle DevTools', run: function () { window.dashboardAPI.windowToggleDevTools(); }, devOnly: true });
    }
    var viewMenu = menuItem('View', viewActions);

    var helpMenu = menuItem('Help', [
      {
        label: 'Check for Update', run: function () {
          manualCheckInFlight = true;
          window.dashboardAPI.checkForUpdate();
        },
      },
      { label: 'Changelog', run: showChangelogModal },
      { label: 'About', run: showAboutModal },
    ]);

    var menuBar = el('div', { class: 'dds-tb-menu' }, [fileMenu, viewMenu, helpMenu]);

    var minBtn = el('button', { class: 'dds-tb-btn', title: 'Minimize' }, []);
    minBtn.textContent = '–';
    minBtn.onclick = function () { window.dashboardAPI.windowMinimize(); };

    var maxBtn = el('button', { class: 'dds-tb-btn', title: 'Maximize' }, []);
    maxBtn.textContent = '□';
    maxBtn.onclick = function () { window.dashboardAPI.windowToggleMaximize(); };

    var closeBtn = el('button', { class: 'dds-tb-btn dds-tb-close', title: 'Close' }, []);
    closeBtn.textContent = '✕';
    closeBtn.onclick = function () { window.dashboardAPI.windowClose(); };

    var controls = el('div', { class: 'dds-tb-controls' }, [minBtn, maxBtn, closeBtn]);

    var left = el('div', { class: 'dds-tb-left' }, [icon, titleText]);
    var bar = el('div', { id: 'dds-titlebar' }, [left, menuBar, controls]);

    bar.addEventListener('dblclick', function (e) {
      if (e.target === bar || e.target === left || e.target === titleText) {
        window.dashboardAPI.windowToggleMaximize();
      }
    });

    document.body.insertBefore(bar, document.body.firstChild);

    document.addEventListener('click', closeAllTbMenus);

    function syncMaximizeIcon(maximized) {
      maxBtn.textContent = maximized ? '❐' : '□';
      maxBtn.title = maximized ? 'Restore' : 'Maximize';
    }
    window.dashboardAPI.windowIsMaximized().then(syncMaximizeIcon);
    window.dashboardAPI.onWindowState(function (data) {
      if (typeof data.maximized === 'boolean') syncMaximizeIcon(data.maximized);
    });
  }

  // ---------- Error logging ----------

  function wireErrorLogging() {
    window.addEventListener('error', function (e) {
      try { window.dashboardAPI.logClientError(e.message + ' @ ' + e.filename + ':' + e.lineno); } catch (_) {}
    });
    window.addEventListener('unhandledrejection', function (e) {
      try { window.dashboardAPI.logClientError('Unhandled promise rejection: ' + (e.reason && e.reason.message || e.reason)); } catch (_) {}
    });
  }

  // ---------- Init ----------

  async function init() {
    appInfo = await window.dashboardAPI.getAppInfo();

    buildTitleBar();
    maybeShowWelcome();
    injectSettingsPanel();
    wireErrorLogging();

    window.dashboardAPI.onUpdateStatus(handleUpdateStatus);
  }

  init();
})();
