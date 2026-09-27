# Changelog

Semua perubahan penting pada aplikasi ini dicatat di file ini.
Format versi mengikuti [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`.

## Version 1.2.1
- Perbaikan: Rig Position sekarang menggabungkan sheet snapshot ("POSITION") dengan sheet log bertanggal per-kontraktor (mis. "GGM") — data bertanggal yang usianya maksimal 7 hari dari tanggal terbaru akan menggantikan posisi di snapshot untuk Rig yang sama; Rig dengan data lebih dari 7 hari otomatis disembunyikan dari peta dan dilaporkan di pesan status.

## Version 1.2.0
- Tambahan: upload file Rig Position (.xlsx) di tab Hole Track — posisi tiap Rig sekarang tampil sebagai titik di Peta Persebaran Hole, lengkap dengan sub-pit/status/tanggal update kalau tersedia di file sumbernya.

## Version 1.1.4
- Perbaikan: banner "Update tersedia" tertutup sebagian oleh title bar custom aplikasi (cuma kelihatan sedikit di bagian bawahnya) — sekarang tampil penuh di bawah title bar.

## Version 1.1.3
- Perbaikan: teks "Memeriksa pembaruan..." di panel Settings tidak pernah berubah lagi setelah pengecekan selesai — sekarang ikut update sesuai hasil sebenarnya (sudah versi terbaru / update tersedia / gagal, dsb), plus notifikasi kalau GitHub lambat merespons.

## Version 1.1.2
- Perbaikan: kalau ada sheet Excel yang gagal diparsing (misalnya karena rumus yang terlalu banyak/korup), sekarang muncul pesan error yang jelas & actionable, bukan macet tanpa penjelasan.
- Tambahan: peringatan di awal kalau file yang diupload berukuran besar (>15 MB), supaya proses yang lama tidak disangka macet.

## Version 1.1.1
- Perbaikan: upload file Excel besar (multi-tahun/multi-kontraktor) bisa membuat aplikasi "tidak merespons" — proses parsing sekarang dipindah ke background thread supaya jendela aplikasi tetap responsif.

## Version 1.1.0
- Tambahan: panel "Hole Finish per Rig" di tab Hole Track — cross-check Hole ID berstatus Finish antara data OEE harian dan file Hole Finish (LIST HOLE FINISHED), dengan tanda kalau ada Rig/status yang tidak cocok antara kedua sumber.

## Version 1.0.0
- Rilis awal aplikasi desktop Drilling Dashboard (migrasi dari `DASHBOARD.html`).
- Dashboard OEE Drilling berjalan sebagai aplikasi Windows mandiri (tidak perlu browser).
- Sistem versioning, update checker (GitHub Releases), dan notifikasi update.
- Export/Import backup data pengguna, auto-backup sebelum update.
- Installer Windows (.exe) dan versi portable.
