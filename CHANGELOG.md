# Changelog

Semua perubahan penting pada aplikasi ini dicatat di file ini.
Format versi mengikuti [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`.

## Version 1.4.0
- Tambahan: tab Hole Track bisa menyimpan file detail hole GGM dan BPMS sekaligus. Kontraktor tiap file dikenali otomatis dari isinya (kolom kontraktor / awalan Rig ID), dengan nama file sebagai cadangan; upload ulang file kontraktor yang sama menggantikan yang lama.
- Tambahan: data Hole Track yang tampil otomatis mengikuti Contractor di file OEE (OEE GGM → hole GGM, OEE BPMS → hole BPMS), termasuk cross-check Hole Finish per Rig dan ringkasan di Overview. Memilih kontraktor manual di Filter Kontraktor tetap dihormati sampai file OEE baru diupload.

## Version 1.3.1
- Tambahan: tab Hole Track bisa membaca file Hole Finish format BPMS (sheet "Tracking Hole Finish") — sebelumnya file ini salah terbaca sebagai format ringkasan "TRACKING" lama.
- Rig ID di file Hole Finish BPMS yang ditulis angka saja ("1", "15") otomatis disamakan ke format OEE ("BPMS-01", "BPMS-15"), supaya cross-check Hole Finish per Rig tidak menandai semua hole sebagai "Rig tidak cocok". Kolom Deposit dipakai sebagai pengelompokan karena file BPMS tidak punya kolom sub-pit.
- Untuk file yang hanya berisi daftar Hole Finish (tanpa Plan/Cancel), kartu Drill Plan, Sisa Hole, Hole Cancel & % Completion menampilkan "-" alih-alih 0 / 0%. Detail Hole Finish juga menampilkan Total Sample & Recovery (%) bila tersedia.

## Version 1.3.0
- Tambahan: sumber data sample BPMS (Google Sheet "WBN Sample Tracking") di tab Sample — tombol 🔄 Refresh Google Sheet sekarang menarik data GGM dan BPMS sekaligus lalu menggabungkannya. Panel ⚙️ Sumber berisi satu baris per kontraktor (plus link ke Looker Studio BPMS).
- Tambahan: filter Kontraktor di tab Sample, dan kolom Kontraktor di tabel Detail Sample Tracking, drilldown DPO, serta export Excel-nya.
- Tambahan: data sample otomatis mengikuti Contractor di file OEE yang diupload (OEE GGM → sample GGM, OEE BPMS → sample BPMS); memilih filter manual tetap dihormati sampai file OEE baru diupload.
- Perbaikan: DPO dihitung unik per kontraktor, jadi nomor DPO yang sama di GGM & BPMS tidak tergabung. Kalau salah satu sheet gagal ditarik, data terakhirnya dari cache tetap tampil.

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
