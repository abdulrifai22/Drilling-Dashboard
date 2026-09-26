# Drilling Dashboard (Desktop App)

Aplikasi desktop Windows untuk **Daily Report – OEE Drilling RDP GGM**. Dibangun dengan **Electron**, membungkus dashboard HTML/CSS/JS yang sudah ada (`src/index.html`) tanpa mengubah satu baris pun logikanya.

## Konsep Penting: Development vs Production

| | Development Version | Production Version |
|---|---|---|
| Dijalankan lewat | VS Code + `npm start` | File installer `.exe` |
| Butuh Node.js/VS Code? | Ya | **Tidak** |
| Siapa pemakainya | Anda (developer) | User di laptop lain |
| Update source code otomatis jadi update app terinstall? | **Tidak.** Harus lewat proses build → installer baru. |

Alur wajib setiap kali ada perubahan yang mau sampai ke user:

```
Edit source code (VS Code)
        ↓
npm start (test dulu)
        ↓
Naikkan versi (npm run version:patch/minor/major)
        ↓
Update CHANGELOG.md
        ↓
npm run icons   (hanya jika icon berubah)
        ↓
npm run dist    (hasil: installer + portable di dist/)
        ↓
Upload ke GitHub Release (atau bagikan file .exe manual)
        ↓
User meng-install/update
```

## 1. Persiapan (sekali saja)

1. Install [Node.js LTS](https://nodejs.org) (sudah termasuk npm).
2. Buka folder `drilling-dashboard-app/` ini di Visual Studio Code.
3. Buka terminal di VS Code, jalankan:
   ```
   npm install
   ```

## 2. Development

```
npm start
```
Membuka aplikasi sebagai window desktop, memuat `src/index.html`. Edit HTML/CSS/JS di `src/index.html` (dashboard asli) atau `src/js/app-shell.js` / `src/css/app-shell.css` (lapisan integrasi Electron), lalu jalankan ulang `npm start` untuk melihat hasilnya (Ctrl+R di window app juga reload tanpa restart proses).

**Jangan edit `main.js`/`preload.js`/`updater/updater.js` kecuali memang perlu mengubah perilaku aplikasi Electron-nya** (bukan dashboard-nya) — dashboard tetap 100% berada di `src/index.html`.

## 3. Menaikkan Versi

```
npm run version:patch   # 1.0.0 -> 1.0.1 (bug fix)
npm run version:minor   # 1.0.0 -> 1.1.0 (fitur baru)
npm run version:major   # 1.0.0 -> 2.0.0 (perubahan besar)
```
Ini otomatis mengubah `version` di `package.json`. **Selalu update `CHANGELOG.md` secara manual** sebelum build, tambahkan section baru di atas:
```markdown
## Version 1.1.0
- Menambahkan fitur X
- Memperbaiki bug Y
```

## 4. Icon Aplikasi

Icon default diambil dari favicon dashboard (`src/assets/icon-source.png`, 64×64 — cukup untuk mulai, tapi disarankan diganti dengan versi resolusi lebih tinggi, idealnya 256×256, jika ingin hasil lebih tajam). Untuk regenerate `build/icon.ico`:
```
npm run icons
```

## 5. Build

- Build cepat tanpa installer (untuk cek folder hasil packaging):
  ```
  npm run build
  ```
- Build installer Windows (NSIS) + versi portable:
  ```
  npm run dist
  ```
  Hasil ada di `dist/`:
  - `Drilling Dashboard-Setup-<version>.exe` — installer utama (Start Menu + Desktop shortcut, bisa pilih lokasi install).
  - `Drilling Dashboard-Portable-<version>.exe` — versi portable, tidak perlu install, tinggal jalankan.

## 6. Testing Installer

1. Jalankan `Drilling Dashboard-Setup-<version>.exe` di komputer ini atau komputer lain.
2. Pastikan aplikasi terbuka tanpa VS Code/Node.js terinstall.
3. Coba upload file data, cek chart/tabel, cek panel **Settings → Application** (Version, Check for Update, Export/Import Backup).

## 7. Membuat Release di GitHub (untuk Auto-Update)

1. Buat repository baru di GitHub (bisa privat atau publik).
2. Di folder project, inisialisasi remote:
   ```
   git remote add origin https://github.com/USERNAME/REPO.git
   git push -u origin main
   ```
3. Edit **`config/update.config.json`**:
   ```json
   {
     "provider": "github",
     "owner": "USERNAME",
     "repo": "REPO"
   }
   ```
   Ganti juga `owner`/`repo` di bagian `"build".."publish"` pada `package.json` dengan nilai yang sama.
4. Buat [Personal Access Token GitHub](https://github.com/settings/tokens) dengan izin `repo`, lalu set sebagai environment variable sebelum publish:
   ```
   $env:GH_TOKEN="ghp_xxxxxxxxxxxx"
   ```
5. Build sekaligus upload ke GitHub Release:
   ```
   npm run dist:publish
   ```
   Ini membuat release baru di GitHub sesuai `version` di `package.json`, mengupload installer + portable + metadata update (`latest.yml`).

## 8. Cara Auto-Update Bekerja

- Aplikasi mengecek update ~3 detik setelah dibuka (bisa diubah di `config/update.config.json` → `checkDelaySeconds`, atau dimatikan dengan `checkOnStartup: false`).
- Jika ada versi lebih baru di GitHub Releases: muncul **banner** di atas dashboard — versi saat ini vs terbaru, tombol **Update Sekarang**, **Ingatkan Nanti**, **Changelog**.
- **Tidak ada update diam-diam** — download hanya mulai setelah user klik "Update Sekarang".
- Sebelum download dimulai, aplikasi otomatis membuat backup data ke `%APPDATA%\Drilling Dashboard\backups\`.
- Setelah selesai download, tombol berubah jadi **Restart & Install**.
- Jika tidak ada update: tidak ada notifikasi mengganggu (hanya muncul "Anda menggunakan versi terbaru" kalau user klik cek manual di Settings).
- `config/update.config.json` masih berisi placeholder (`YOUR_GITHUB_USERNAME`) → update checker otomatis nonaktif dan diam (tidak error ke user), sampai diisi.

## 9. Update Manual (tanpa internet / tanpa GitHub)

Kirim file `Drilling Dashboard-Setup-<version-baru>.exe` ke user (flashdisk, email, dsb). Jalankan installer tersebut di atas instalasi lama — ini akan meng-update aplikasi **tanpa menghapus data** (lihat bagian Data di bawah).

## 10. Lokasi Data Pengguna

Aplikasi memakai `localStorage` (sama seperti versi browser aslinya). Electron menyimpannya otomatis di:
```
%APPDATA%\Drilling Dashboard\Local Storage\
```
Lokasi ini **terpisah total** dari folder instalasi aplikasi (`C:\Program Files\Drilling Dashboard\...`), sehingga aman terhadap update maupun reinstall. **Jangan pernah mengganti `productName`/`appId` di `package.json`/`config/app.config.json`** setelah rilis — ini akan membuat Windows memakai folder AppData yang berbeda dan seolah-olah data lama "hilang".

Backup file (manual maupun otomatis sebelum update) disimpan di:
```
%APPDATA%\Drilling Dashboard\backups\
```

Log aplikasi:
```
%APPDATA%\Drilling Dashboard\logs\app.log
```

Buka folder ini langsung dari aplikasi lewat **Settings → Application → Open Data Folder**.

## 11. Backup & Restore

- **Export Backup**: Settings → Application → Export Backup (atau menu File → Export Backup). Menyimpan seluruh data dashboard (riwayat upload, filter, config Google Sheet, cache sample, hole plan) ke satu file `dashboard-backup-YYYY-MM-DD.json`.
- **Import Backup**: Settings → Application → Import Backup (atau menu File → Import Backup). Pilih file backup, data akan dipulihkan dan halaman reload otomatis.

## 12. Troubleshooting

- **`npm run build` / `npm run dist` gagal dengan error `Cannot create symbolic link: A required privilege is not held by the client`**: ini masalah izin Windows, bukan bug di project. `electron-builder` butuh membuat symbolic link saat mengekstrak cache tooling-nya. Perbaiki salah satu cara berikut (sekali saja per komputer):
  1. Aktifkan **Developer Mode**: Settings → Privacy & Security → For Developers → nyalakan "Developer Mode", lalu ulangi `npm run dist`. (Direkomendasikan)
  2. Atau jalankan terminal VS Code sebagai **Administrator** saat build.
- **Aplikasi error/blank saat dibuka**: akan muncul dialog "Terjadi kesalahan..." dengan tombol **Try Again** (reload) dan **Open Data Folder**. Cek juga `logs/app.log` di folder data (lihat poin 10).
- **Update gagal**: aplikasi tetap memakai versi lama, tidak ada data yang hilang. Cek koneksi internet dan isi `config/update.config.json`.
- **Ingin mulai dari data kosong**: hapus isi folder `%APPDATA%\Drilling Dashboard\Local Storage\` (aplikasi harus ditutup dulu) — lakukan backup dulu jika data masih diperlukan.
- **Icon aplikasi masih default Electron**: jalankan `npm run icons` sebelum `npm run dist`.

## Struktur Folder

```
drilling-dashboard-app/
├── src/
│   ├── index.html        # Dashboard asli (TIDAK diubah dari DASHBOARD.html)
│   ├── css/app-shell.css # Style tambahan integrasi Electron
│   ├── js/app-shell.js   # Logic integrasi Electron (banner update, backup, dll)
│   └── assets/           # Sumber icon aplikasi
├── config/
│   ├── app.config.json     # Identitas aplikasi (nama, publisher)
│   └── update.config.json  # Sumber auto-update (GitHub owner/repo) — edit tanpa rebuild
├── updater/updater.js    # Wrapper electron-updater
├── data/                 # Placeholder (data user sesungguhnya ada di %APPDATA%, lihat poin 10)
├── build/icon.ico        # Icon aplikasi (digenerate, lihat poin 4)
├── scripts/generate-icon.js
├── main.js                # Proses utama Electron (window, menu, IPC, error handling)
├── preload.js              # Jembatan aman renderer <-> main process
├── logger.js                # Logger sederhana
├── package.json / package-lock.json
├── CHANGELOG.md
└── README.md
```

## Keamanan (Electron)

`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`. Seluruh komunikasi renderer ↔ main process lewat `preload.js` (`window.dashboardAPI`) yang divalidasi di `main.js`. Tidak ada Node.js API yang terekspos langsung ke halaman dashboard.

> Catatan: Content-Security-Policy ketat tidak diterapkan karena dashboard asli memakai banyak atribut `onclick="..."` inline pada elemen HTML-nya; menulis ulang semuanya berisiko merusak fungsi dashboard dan berada di luar scope "tidak mengubah logika yang sudah ada". Sebagai gantinya keamanan dijaga lewat isolasi proses, pembatasan navigasi (link eksternal dibuka di browser sistem, bukan di window aplikasi), dan API terbatas lewat `preload.js`.
