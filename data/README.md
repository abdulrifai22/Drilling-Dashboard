# Folder `data/`

Folder ini **sengaja dikosongkan** dan tidak dibundel ke dalam installer. Disediakan sesuai struktur project standar, tersedia untuk masa depan jika perlu membundel dataset contoh/referensi bersama aplikasi.

**Data pengguna sesungguhnya (upload Excel/CSV, filter, target override, cache Google Sheet, hole plan) TIDAK disimpan di sini.** Dashboard menyimpan semuanya lewat `localStorage` bawaan Chromium, yang oleh Electron otomatis diletakkan di:

```
%APPDATA%\Drilling Dashboard\Local Storage\
```

Lokasi ini terpisah total dari folder instalasi aplikasi (`C:\Program Files\Drilling Dashboard` atau lokasi custom lain), sehingga aman saat aplikasi di-update maupun di-reinstall.

File backup manual (Export Backup) dan backup otomatis sebelum update disimpan di:

```
%APPDATA%\Drilling Dashboard\backups\
```

Log aplikasi ada di:

```
%APPDATA%\Drilling Dashboard\logs\app.log
```

Lihat `README.md` di root project untuk detail lengkap.
